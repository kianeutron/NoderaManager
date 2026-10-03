import { and, count, desc, eq, ilike, inArray, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import { closedProspectStatuses } from "@/modules/prospects/domain/prospect-status";
import type { ProspectSearchQuery, ProspectSort } from "@/modules/prospects/domain/prospect.schema";
import type { KeysetCursor } from "@/shared/api/keyset";
import type { getDatabase } from "@/shared/db/client";
import { escapeLikePattern } from "@/shared/db/escape-like";
import { keysetAfter, keysetOrderBy, keysetSortKey, type KeysetSort } from "@/shared/db/keyset";
import { organizations, people, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { signals } from "@/shared/db/schema/strategy";
import { normalizeText } from "@/shared/lib/normalize-text";

type ProspectsDatabase = ReturnType<typeof getDatabase>;

export type ProspectFilters = Omit<ProspectSearchQuery, "sort" | "limit" | "cursor">;
export type ProspectSearchCriteria = ProspectFilters & Readonly<{ sort: ProspectSort; limit: number; cursor?: KeysetCursor<ProspectSort> }>;
export type OpenProspectTarget = Readonly<{ personId: string | null; organizationId: string | null; routeId: string; routeModuleId: string | null }>;

// Matches the partial index prospects_updated_sort_index.
const sorts = {
  updated: { expression: sql`${prospects.updatedAt}`, direction: "desc", text: sql<string>`${prospects.updatedAt}::text`, cast: "timestamptz" }
} as const satisfies Record<ProspectSort, KeysetSort>;

function conditionsFor({ q, statuses, routeId, routeModuleId, personId, organizationId, temperature, countryCode }: ProspectFilters): SQL[] {
  const conditions: SQL[] = [isNull(prospects.archivedAt)];
  if (statuses && statuses.length > 0) conditions.push(inArray(prospects.status, statuses));
  if (routeId) conditions.push(eq(prospects.routeId, routeId));
  if (routeModuleId) conditions.push(eq(prospects.routeModuleId, routeModuleId));
  if (personId) conditions.push(eq(prospects.personId, personId));
  if (organizationId) conditions.push(eq(prospects.organizationId, organizationId));
  if (temperature) conditions.push(eq(prospects.temperature, temperature));
  if (countryCode) conditions.push(or(eq(people.countryCode, countryCode), eq(organizations.countryCode, countryCode)) ?? sql`false`);
  if (q) {
    const pattern = `%${escapeLikePattern(normalizeText(q))}%`;
    conditions.push(or(sql`${prospects.searchVector} @@ plainto_tsquery('simple', ${q})`, ilike(people.normalizedName, pattern), ilike(organizations.normalizedName, pattern)) ?? sql`false`);
  }
  return conditions;
}

export function createProspectRepository(database: ProspectsDatabase) {
  const summaryColumns = {
    id: prospects.id, status: prospects.status, temperature: prospects.temperature, personId: people.id, personName: people.fullName, organizationId: organizations.id, organizationName: organizations.name,
    routeId: routes.id, routeName: routes.name, moduleId: routeModules.id, moduleName: routeModules.name, nextAction: prospects.nextAction, lastContactedAt: prospects.lastContactedAt, updatedAt: prospects.updatedAt
  };

  return {
    /** The prospect and its contacts in one read, for the rules about contacting them and for deriving who a message or interaction is about. */
    findProspectContact: async (prospectId: string) => {
      const [row] = await database.select({
        prospectId: prospects.id, status: prospects.status, archivedAt: prospects.archivedAt, routeId: prospects.routeId, routeModuleId: prospects.routeModuleId,
        personId: prospects.personId, personArchivedAt: people.archivedAt, doNotContactAt: people.doNotContactAt, personExists: people.id,
        organizationId: prospects.organizationId, organizationArchivedAt: organizations.archivedAt, organizationExists: organizations.id
      }).from(prospects)
        .leftJoin(people, eq(people.id, prospects.personId))
        .leftJoin(organizations, eq(organizations.id, prospects.organizationId))
        .where(eq(prospects.id, prospectId))
        .limit(1);
      return row ?? null;
    },

    searchProspects: (criteria: ProspectSearchCriteria) =>
      database.select({ ...summaryColumns, sortKey: keysetSortKey(sorts[criteria.sort]) }).from(prospects)
        .leftJoin(people, eq(people.id, prospects.personId))
        .leftJoin(organizations, eq(organizations.id, prospects.organizationId))
        .innerJoin(routes, eq(routes.id, prospects.routeId))
        .leftJoin(routeModules, eq(routeModules.id, prospects.routeModuleId))
        .where(and(...conditionsFor(criteria), criteria.cursor ? keysetAfter(sorts[criteria.cursor.sort], prospects.id, criteria.cursor) : undefined))
        .orderBy(...keysetOrderBy(sorts[criteria.sort], prospects.id))
        .limit(criteria.limit + 1),

    countProspects: async (filters: ProspectFilters) => {
      const [row] = await database.select({ total: count() }).from(prospects)
        .leftJoin(people, eq(people.id, prospects.personId))
        .leftJoin(organizations, eq(organizations.id, prospects.organizationId))
        .where(and(...conditionsFor(filters)));
      return row?.total ?? 0;
    },

    findProspect: async (id: string) => {
      const [row] = await database.select({
        ...summaryColumns, source: prospects.source, whyTargeted: prospects.whyTargeted, currentTrigger: prospects.currentTrigger,
        structuralReason: prospects.structuralReason, statusChangedAt: prospects.statusChangedAt
      }).from(prospects)
        .leftJoin(people, eq(people.id, prospects.personId))
        .leftJoin(organizations, eq(organizations.id, prospects.organizationId))
        .innerJoin(routes, eq(routes.id, prospects.routeId))
        .leftJoin(routeModules, eq(routeModules.id, prospects.routeModuleId))
        .where(and(eq(prospects.id, id), isNull(prospects.archivedAt)))
        .limit(1);
      return row ?? null;
    },

    listSignals: (prospectId: string, limit: number) =>
      database.select({ id: signals.id, type: signals.type, summary: signals.summary, sourceUrl: signals.sourceUrl, observedAt: signals.observedAt, expiresAt: signals.expiresAt }).from(signals)
        .where(eq(signals.prospectId, prospectId))
        .orderBy(desc(signals.observedAt), desc(signals.id))
        .limit(limit),

    /** The prospect a repeated create should return: same target and route(/module), still open. */
    findOpenProspect: async (target: OpenProspectTarget) => {
      const [row] = await database.select({ id: prospects.id }).from(prospects)
        .where(and(
          isNull(prospects.archivedAt),
          notInArray(prospects.status, [...closedProspectStatuses]),
          eq(prospects.routeId, target.routeId),
          target.routeModuleId ? eq(prospects.routeModuleId, target.routeModuleId) : isNull(prospects.routeModuleId),
          target.personId ? eq(prospects.personId, target.personId) : isNull(prospects.personId),
          target.organizationId ? eq(prospects.organizationId, target.organizationId) : isNull(prospects.organizationId)
        ))
        .limit(1);
      return row ?? null;
    },

    findSignal: async (prospectId: string, type: (typeof signals.$inferSelect)["type"], summary: string) => {
      const [row] = await database.select({ id: signals.id }).from(signals)
        .where(and(eq(signals.prospectId, prospectId), eq(signals.type, type), sql`lower(${signals.summary}) = lower(${summary})`))
        .limit(1);
      return row ?? null;
    }
  };
}

export type ProspectRepository = ReturnType<typeof createProspectRepository>;
