import { and, count, desc, eq, gt, ilike, inArray, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { OutreachSearchQuery, OutreachSort, OutreachTargetQuery } from "@/modules/outreach/domain/outreach.schema";
import { closedProspectStatuses } from "@/modules/prospects/domain/prospect-status";
import type { KeysetCursor } from "@/shared/api/keyset";
import type { getDatabase } from "@/shared/db/client";
import { escapeLikePattern } from "@/shared/db/escape-like";
import { keysetAfter, keysetOrderBy, keysetSortKey, type KeysetSort } from "@/shared/db/keyset";
import { organizations, people, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { campaigns } from "@/shared/db/schema/strategy";
import { outreachMessages } from "@/shared/db/schema/engagement";
import { normalizeText } from "@/shared/lib/normalize-text";

type OutreachDatabase = ReturnType<typeof getDatabase>;

export type OutreachFilters = Pick<OutreachSearchQuery, "q" | "channel" | "replyStatus" | "prospectId">;
export type OutreachSearchCriteria = OutreachFilters & Readonly<{ sort: OutreachSort; limit: number; cursor?: KeysetCursor<OutreachSort> }>;

const previewLength = 160;
const targetLimit = 25;
const recentDuplicateWindowMinutes = 10;

// Newest first. `outreach_messages_sent_at_index` covers the sort key; the id only breaks ties, so the database finishes
// the order with a cheap incremental sort. A composite (sent_at, id) index is the upgrade if this list ever gets large.
const sorts = {
  sent: { expression: sql`${outreachMessages.sentAt}`, direction: "desc", text: sql<string>`${outreachMessages.sentAt}::text`, cast: "timestamptz" }
} as const satisfies Record<OutreachSort, KeysetSort>;

function conditionsFor({ q, channel, replyStatus, prospectId }: OutreachFilters): SQL[] {
  const conditions: SQL[] = [];
  if (channel) conditions.push(eq(outreachMessages.channel, channel));
  if (replyStatus) conditions.push(eq(outreachMessages.replyStatus, replyStatus));
  if (prospectId) conditions.push(eq(outreachMessages.prospectId, prospectId));
  if (q) {
    const pattern = `%${escapeLikePattern(normalizeText(q))}%`;
    // Names match as you type; message text matches whole words through the full-text index.
    conditions.push(or(ilike(people.normalizedName, pattern), ilike(organizations.normalizedName, pattern), sql`${outreachMessages.searchVector} @@ plainto_tsquery('simple', ${q})`) ?? sql`false`);
  }
  return conditions;
}

const withContacts = <Query extends { leftJoin: (...args: never[]) => Query }>(query: Query) => query;

export function createOutreachRepository(database: OutreachDatabase) {
  return {
    searchMessages: (criteria: OutreachSearchCriteria) =>
      database.select({
        id: outreachMessages.id, channel: outreachMessages.channel, subject: outreachMessages.subject, preview: sql<string>`left(${outreachMessages.body}, ${previewLength})`,
        sentAt: outreachMessages.sentAt, deliveryStatus: outreachMessages.deliveryStatus, replyStatus: outreachMessages.replyStatus, prospectId: outreachMessages.prospectId,
        personId: people.id, personName: people.fullName, organizationId: organizations.id, organizationName: organizations.name,
        sortKey: keysetSortKey(sorts[criteria.sort])
      }).from(outreachMessages)
        .leftJoin(people, eq(people.id, outreachMessages.personId))
        .leftJoin(organizations, eq(organizations.id, outreachMessages.organizationId))
        .where(and(...conditionsFor(criteria), criteria.cursor ? keysetAfter(sorts[criteria.cursor.sort], outreachMessages.id, criteria.cursor) : undefined))
        .orderBy(...keysetOrderBy(sorts[criteria.sort], outreachMessages.id))
        .limit(criteria.limit + 1),

    countMessages: async (filters: OutreachFilters) => {
      const [row] = await database.select({ total: count() }).from(outreachMessages)
        .leftJoin(people, eq(people.id, outreachMessages.personId))
        .leftJoin(organizations, eq(organizations.id, outreachMessages.organizationId))
        .where(and(...conditionsFor(filters)));
      return row?.total ?? 0;
    },

    findMessage: async (id: string) => {
      const [row] = await database.select({
        id: outreachMessages.id, channel: outreachMessages.channel, subject: outreachMessages.subject, body: outreachMessages.body, sentAt: outreachMessages.sentAt,
        deliveryStatus: outreachMessages.deliveryStatus, bounceStatus: outreachMessages.bounceStatus, replyStatus: outreachMessages.replyStatus, prospectId: outreachMessages.prospectId,
        personId: people.id, personName: people.fullName, organizationId: organizations.id, organizationName: organizations.name,
        prospectStatus: prospects.status, routeName: routes.name, moduleName: routeModules.name, campaignId: campaigns.id, campaignName: campaigns.name
      }).from(outreachMessages)
        .innerJoin(prospects, eq(prospects.id, outreachMessages.prospectId))
        .innerJoin(routes, eq(routes.id, prospects.routeId))
        .leftJoin(routeModules, eq(routeModules.id, prospects.routeModuleId))
        .leftJoin(campaigns, eq(campaigns.id, outreachMessages.campaignId))
        .leftJoin(people, eq(people.id, outreachMessages.personId))
        .leftJoin(organizations, eq(organizations.id, outreachMessages.organizationId))
        .where(eq(outreachMessages.id, id))
        .limit(1);
      return row ?? null;
    },

    /** Real totals over every message, not over whatever page is on screen. */
    summarize: async () => {
      const [row] = await database.select({
        total: count(),
        last7Days: sql<number>`count(*) filter (where ${gt(outreachMessages.sentAt, sql`now() - interval '7 days'`)})::int`,
        delivered: sql<number>`count(*) filter (where ${eq(outreachMessages.deliveryStatus, "delivered")})::int`,
        replied: sql<number>`count(*) filter (where ${sql`${outreachMessages.replyStatus} <> 'none'`})::int`
      }).from(outreachMessages);
      return row ?? { total: 0, last7Days: 0, delivered: 0, replied: 0 };
    },

    /** Prospects a message can go to right now: open, not archived, and not for someone marked do-not-contact or archived. */
    listTargets: ({ q }: OutreachTargetQuery) => {
      const pattern = q ? `%${escapeLikePattern(normalizeText(q))}%` : null;
      return database.select({ prospectId: prospects.id, personName: people.fullName, organizationName: organizations.name, routeName: routes.name, status: prospects.status }).from(prospects)
        .innerJoin(routes, eq(routes.id, prospects.routeId))
        .leftJoin(people, eq(people.id, prospects.personId))
        .leftJoin(organizations, eq(organizations.id, prospects.organizationId))
        .where(and(
          isNull(prospects.archivedAt),
          notInArray(prospects.status, [...closedProspectStatuses]),
          or(isNull(people.id), and(isNull(people.archivedAt), isNull(people.doNotContactAt))),
          or(isNull(organizations.id), isNull(organizations.archivedAt)),
          pattern ? or(ilike(people.normalizedName, pattern), ilike(organizations.normalizedName, pattern)) : undefined
        ))
        .orderBy(desc(prospects.updatedAt), desc(prospects.id))
        .limit(targetLimit);
    },

    /** The same text sent on the same channel to the same prospect moments ago is a double submit, not a second message. */
    findRecentDuplicate: async (draft: Readonly<{ prospectId: string; channel: string; subject: string | null; body: string }>) => {
      const [row] = await database.select({ id: outreachMessages.id }).from(outreachMessages)
        .where(and(
          eq(outreachMessages.prospectId, draft.prospectId),
          sql`${outreachMessages.channel} = ${draft.channel}`,
          draft.subject === null ? isNull(outreachMessages.subject) : eq(outreachMessages.subject, draft.subject),
          eq(outreachMessages.body, draft.body),
          gt(outreachMessages.createdAt, sql`now() - make_interval(mins => ${recentDuplicateWindowMinutes}::int)`)
        ))
        .orderBy(desc(outreachMessages.createdAt))
        .limit(1);
      return row ?? null;
    }
  };
}

export type OutreachRepository = ReturnType<typeof createOutreachRepository>;
