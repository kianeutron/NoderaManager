import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { CampaignMembersQuery, CampaignSearchQuery, CampaignSort, MemberSort } from "@/modules/campaigns/domain/campaign.schema";
import { closedProspectStatuses } from "@/modules/prospects/domain/prospect-status";
import type { KeysetCursor } from "@/shared/api/keyset";
import type { getDatabase } from "@/shared/db/client";
import { escapeLikePattern } from "@/shared/db/escape-like";
import { keysetAfter, keysetOrderBy, keysetSortKey, type KeysetSort } from "@/shared/db/keyset";
import { organizations, people, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { outreachMessages } from "@/shared/db/schema/engagement";
import { campaignProspects, campaignRoutes, campaigns } from "@/shared/db/schema/strategy";
import { normalizeText } from "@/shared/lib/normalize-text";

type CampaignsDatabase = ReturnType<typeof getDatabase>;

export type CampaignFilters = Pick<CampaignSearchQuery, "q" | "status" | "scope" | "prospectId">;
export type CampaignSearchCriteria = CampaignFilters & Readonly<{ sort: CampaignSort; limit: number; cursor?: KeysetCursor<CampaignSort> }>;
export type MemberCriteria = Pick<CampaignMembersQuery, "limit"> & Readonly<{ sort: MemberSort; cursor?: KeysetCursor<MemberSort> }>;
export type RouteEntry = Readonly<{ routeId: string; routeModuleId: string | null }>;

/** How many eligible prospects are read before ranking by the targeting rules. Plenty for one person's pipeline. */
const suggestionCandidateLimit = 200;

const sorts = {
  updated: { expression: sql`${campaigns.updatedAt}`, direction: "desc", text: sql<string>`${campaigns.updatedAt}::text`, cast: "timestamptz" }
} as const satisfies Record<CampaignSort, KeysetSort>;

const memberSorts = {
  added: { expression: sql`${campaignProspects.createdAt}`, direction: "desc", text: sql<string>`${campaignProspects.createdAt}::text`, cast: "timestamptz" }
} as const satisfies Record<MemberSort, KeysetSort>;

// Correlated checks are written with explicit aliases and qualified names. Drizzle leaves column names unqualified in a
// single-table query, which would make `campaign_id = id` here compare the subquery's own columns with each other.
const isMemberOfCampaignRow = (prospectId: string) => sql`exists (select 1 from "campaign_prospects" as "member" where "member"."campaign_id" = "campaigns"."id" and "member"."prospect_id" = ${prospectId})`;
const isNotMemberOfCampaign = (campaignId: string) => sql`not exists (select 1 from "campaign_prospects" as "member" where "member"."campaign_id" = ${campaignId} and "member"."prospect_id" = "prospects"."id")`;

function conditionsFor({ q, status, scope, prospectId }: CampaignFilters): SQL[] {
  const conditions: SQL[] = [scope === "archived" ? isNotNull(campaigns.archivedAt) : isNull(campaigns.archivedAt)];
  if (status) conditions.push(eq(campaigns.status, status));
  if (q) conditions.push(ilike(campaigns.normalizedName, `%${escapeLikePattern(normalizeText(q))}%`));
  if (prospectId) conditions.push(isMemberOfCampaignRow(prospectId));
  return conditions;
}

const campaignColumns = { id: campaigns.id, name: campaigns.name, goal: campaigns.goal, status: campaigns.status, startsAt: campaigns.startsAt, endsAt: campaigns.endsAt, archivedAt: campaigns.archivedAt, updatedAt: campaigns.updatedAt };

const prospectColumns = {
  prospectId: prospects.id, status: prospects.status, lastContactedAt: prospects.lastContactedAt, routeName: routes.name, moduleName: routeModules.name,
  personId: people.id, personName: people.fullName, organizationId: organizations.id, organizationName: organizations.name
};

export function createCampaignRepository(database: CampaignsDatabase) {
  return {
    searchCampaigns: (criteria: CampaignSearchCriteria) =>
      database.select({ ...campaignColumns, sortKey: keysetSortKey(sorts[criteria.sort]) }).from(campaigns)
        .where(and(...conditionsFor(criteria), criteria.cursor ? keysetAfter(sorts[criteria.cursor.sort], campaigns.id, criteria.cursor) : undefined))
        .orderBy(...keysetOrderBy(sorts[criteria.sort], campaigns.id))
        .limit(criteria.limit + 1),

    countCampaigns: async (filters: CampaignFilters) => {
      const [row] = await database.select({ total: count() }).from(campaigns).where(and(...conditionsFor(filters)));
      return row?.total ?? 0;
    },

    /** A campaign in any state, archived included, so it can be shown and restored. */
    findCampaign: async (id: string) => {
      const [row] = await database.select({ ...campaignColumns, normalizedName: campaigns.normalizedName, targetingRules: campaigns.targetingRules }).from(campaigns).where(eq(campaigns.id, id)).limit(1);
      return row ?? null;
    },

    /** Names are unique regardless of archival, so this also finds an archived campaign. */
    findCampaignByNormalizedName: async (normalizedName: string) => {
      const [row] = await database.select({ id: campaigns.id, archivedAt: campaigns.archivedAt }).from(campaigns).where(eq(campaigns.normalizedName, normalizedName)).limit(1);
      return row ?? null;
    },

    /** The routes and modules the given campaigns work, with names, in one read. */
    listCampaignRoutes: (campaignIds: readonly string[]) =>
      campaignIds.length === 0
        ? Promise.resolve([])
        : database.select({ campaignId: campaignRoutes.campaignId, routeId: routes.id, routeName: routes.name, moduleId: routeModules.id, moduleName: routeModules.name }).from(campaignRoutes)
          .innerJoin(routes, eq(routes.id, campaignRoutes.routeId))
          .leftJoin(routeModules, eq(routeModules.id, campaignRoutes.routeModuleId))
          .where(inArray(campaignRoutes.campaignId, [...campaignIds]))
          .orderBy(asc(routes.sortOrder), asc(sql`lower(${routes.name})`), sql`lower(${routeModules.name}) asc nulls first`),

    /** Member counts per campaign. Archived prospects are not counted. */
    countMembersByCampaign: (campaignIds: readonly string[]) =>
      campaignIds.length === 0
        ? Promise.resolve([])
        : database.select({
          campaignId: campaignProspects.campaignId, members: count(),
          contacted: sql<number>`count(*) filter (where ${isNotNull(prospects.lastContactedAt)})::int`,
          won: sql<number>`count(*) filter (where ${eq(prospects.status, "won")})::int`
        }).from(campaignProspects)
          .innerJoin(prospects, eq(prospects.id, campaignProspects.prospectId))
          .where(and(inArray(campaignProspects.campaignId, [...campaignIds]), isNull(prospects.archivedAt)))
          .groupBy(campaignProspects.campaignId),

    /** Messages sent under each campaign, and how many got a real reply. */
    countMessagesByCampaign: (campaignIds: readonly string[]) =>
      campaignIds.length === 0
        ? Promise.resolve([])
        : database.select({ campaignId: outreachMessages.campaignId, messages: count(), replies: sql<number>`count(*) filter (where ${eq(outreachMessages.replyStatus, "replied")})::int` }).from(outreachMessages)
          .where(inArray(outreachMessages.campaignId, [...campaignIds]))
          .groupBy(outreachMessages.campaignId),

    listMembers: (campaignId: string, criteria: MemberCriteria) =>
      database.select({ ...prospectColumns, membershipId: campaignProspects.id, addedAt: campaignProspects.createdAt, sortKey: keysetSortKey(memberSorts[criteria.sort]) }).from(campaignProspects)
        .innerJoin(prospects, eq(prospects.id, campaignProspects.prospectId))
        .innerJoin(routes, eq(routes.id, prospects.routeId))
        .leftJoin(routeModules, eq(routeModules.id, prospects.routeModuleId))
        .leftJoin(people, eq(people.id, prospects.personId))
        .leftJoin(organizations, eq(organizations.id, prospects.organizationId))
        .where(and(eq(campaignProspects.campaignId, campaignId), isNull(prospects.archivedAt), criteria.cursor ? keysetAfter(memberSorts[criteria.cursor.sort], campaignProspects.id, criteria.cursor) : undefined))
        .orderBy(...keysetOrderBy(memberSorts[criteria.sort], campaignProspects.id))
        .limit(criteria.limit + 1),

    countMembers: async (campaignId: string) => {
      const [row] = await database.select({ total: count() }).from(campaignProspects).innerJoin(prospects, eq(prospects.id, campaignProspects.prospectId)).where(and(eq(campaignProspects.campaignId, campaignId), isNull(prospects.archivedAt)));
      return row?.total ?? 0;
    },

    /** Which of these prospects are already in the campaign. */
    findMemberIds: async (campaignId: string, prospectIds: readonly string[]) =>
      (await database.select({ prospectId: campaignProspects.prospectId }).from(campaignProspects).where(and(eq(campaignProspects.campaignId, campaignId), inArray(campaignProspects.prospectId, [...prospectIds])))).map((row) => row.prospectId),

    /** What membership rules need to know about each prospect. */
    findProspectsForMembership: (prospectIds: readonly string[]) =>
      database.select({ id: prospects.id, routeId: prospects.routeId, routeModuleId: prospects.routeModuleId, archivedAt: prospects.archivedAt }).from(prospects).where(inArray(prospects.id, [...prospectIds])),

    /** The campaign's state and whether this prospect is in it, for logging outreach under a campaign. */
    findMembership: async (campaignId: string, prospectId: string) => {
      const [row] = await database.select({ status: campaigns.status, archivedAt: campaigns.archivedAt, isMember: sql<boolean>`${isMemberOfCampaignRow(prospectId)}` }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
      return row ?? null;
    },

    /**
     * Prospects that could join: open, not archived, not for someone marked do-not-contact or archived, on one of the
     * campaign's routes (the same rule `routeMatchesCampaign` applies to a prospect being added), and not already in it.
     * Newest activity first; the service ranks them by the targeting rules.
     */
    listSuggestionCandidates: ({ campaignId, routeEntries, q }: Readonly<{ campaignId: string; routeEntries: readonly RouteEntry[]; q: string | undefined }>) => {
      const pattern = q ? `%${escapeLikePattern(normalizeText(q))}%` : null;
      const onCampaignRoutes = routeEntries.length === 0 ? undefined : or(...routeEntries.map((entry) => entry.routeModuleId ? and(eq(prospects.routeId, entry.routeId), eq(prospects.routeModuleId, entry.routeModuleId)) : eq(prospects.routeId, entry.routeId)));
      return database.select({ ...prospectColumns, persona: people.persona, personCountry: people.countryCode, organizationCountry: organizations.countryCode, organizationType: organizations.organizationType }).from(prospects)
        .innerJoin(routes, eq(routes.id, prospects.routeId))
        .leftJoin(routeModules, eq(routeModules.id, prospects.routeModuleId))
        .leftJoin(people, eq(people.id, prospects.personId))
        .leftJoin(organizations, eq(organizations.id, prospects.organizationId))
        .where(and(
          isNull(prospects.archivedAt),
          notInArray(prospects.status, [...closedProspectStatuses]),
          or(isNull(people.id), and(isNull(people.archivedAt), isNull(people.doNotContactAt))),
          or(isNull(organizations.id), isNull(organizations.archivedAt)),
          onCampaignRoutes,
          isNotMemberOfCampaign(campaignId),
          pattern ? or(ilike(people.normalizedName, pattern), ilike(organizations.normalizedName, pattern)) : undefined
        ))
        .orderBy(desc(prospects.updatedAt), desc(prospects.id))
        .limit(suggestionCandidateLimit);
    }
  };
}

export type CampaignRepository = ReturnType<typeof createCampaignRepository>;
