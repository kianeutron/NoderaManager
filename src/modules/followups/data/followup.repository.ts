import { and, count, eq, gte, isNull, lt, sql, type SQL } from "drizzle-orm";
import type { FollowUpSearchQuery, FollowUpSort } from "@/modules/followups/domain/followup.schema";
import type { KeysetCursor } from "@/shared/api/keyset";
import type { getDatabase } from "@/shared/db/client";
import { keysetAfter, keysetOrderBy, keysetSortKey, type KeysetSort } from "@/shared/db/keyset";
import { organizations, people, prospects, routes } from "@/shared/db/schema/core";
import { followUps, interactions, outreachMessages } from "@/shared/db/schema/engagement";

type FollowUpsDatabase = ReturnType<typeof getDatabase>;

export type FollowUpFilters = Pick<FollowUpSearchQuery, "status" | "due" | "prospectId">;
export type FollowUpSearchCriteria = FollowUpFilters & Readonly<{ sort: FollowUpSort; limit: number; cursor?: KeysetCursor<FollowUpSort> }>;

const inSevenDays = sql`now() + interval '7 days'`;

// A follow-up without a due date sorts last (as "infinity"), so the list reads: overdue, soon, later, undated.
// The table is one person's task list; `follow_ups_active_due_index` covers the due filter, and this order is finished in memory.
const sorts = {
  due: { expression: sql`coalesce(${followUps.dueAt}, 'infinity'::timestamptz)`, direction: "asc", text: sql<string>`coalesce(${followUps.dueAt}, 'infinity'::timestamptz)::text`, cast: "timestamptz" },
  recent: { expression: sql`${followUps.updatedAt}`, direction: "desc", text: sql<string>`${followUps.updatedAt}::text`, cast: "timestamptz" }
} as const satisfies Record<FollowUpSort, KeysetSort>;

function conditionsFor({ status, due, prospectId }: FollowUpFilters): SQL[] {
  const conditions: SQL[] = [eq(followUps.status, status)];
  if (prospectId) conditions.push(eq(followUps.prospectId, prospectId));
  if (due === "overdue") conditions.push(lt(followUps.dueAt, sql`now()`));
  if (due === "next_7_days") conditions.push(and(gte(followUps.dueAt, sql`now()`), lt(followUps.dueAt, inSevenDays)) as SQL);
  if (due === "later") conditions.push(gte(followUps.dueAt, inSevenDays));
  if (due === "no_date") conditions.push(isNull(followUps.dueAt));
  return conditions;
}

const viewColumns = {
  id: followUps.id, status: followUps.status, reason: followUps.reason, dueAt: followUps.dueAt, notBeforeAt: followUps.notBeforeAt, suggestedChannel: followUps.suggestedChannel,
  completedAt: followUps.completedAt, dismissedReason: followUps.dismissedReason, createdAt: followUps.createdAt, prospectId: followUps.prospectId,
  prospectStatus: prospects.status, routeName: routes.name, personId: people.id, personName: people.fullName, organizationId: organizations.id, organizationName: organizations.name
};

export function createFollowUpRepository(database: FollowUpsDatabase) {
  /** Follow-ups with the prospect, route and contacts they are about, in one read. The sort key rides along for the cursor. */
  const rows = (sort: KeysetSort, where: SQL | undefined, limit: number) =>
    database.select({ ...viewColumns, sortKey: keysetSortKey(sort) }).from(followUps)
      .innerJoin(prospects, eq(prospects.id, followUps.prospectId))
      .innerJoin(routes, eq(routes.id, prospects.routeId))
      .leftJoin(people, eq(people.id, prospects.personId))
      .leftJoin(organizations, eq(organizations.id, prospects.organizationId))
      .where(where)
      .orderBy(...keysetOrderBy(sort, followUps.id))
      .limit(limit);

  return {
    searchFollowUps: (criteria: FollowUpSearchCriteria) =>
      rows(sorts[criteria.sort], and(...conditionsFor(criteria), criteria.cursor ? keysetAfter(sorts[criteria.cursor.sort], followUps.id, criteria.cursor) : undefined), criteria.limit + 1),

    countFollowUps: async (filters: FollowUpFilters) => {
      const [row] = await database.select({ total: count() }).from(followUps).where(and(...conditionsFor(filters)));
      return row?.total ?? 0;
    },

    findFollowUp: async (id: string) => {
      const [row] = await rows(sorts.due, eq(followUps.id, id), 1);
      return row ?? null;
    },

    /** Active follow-ups by when they are due, counted over all of them. */
    summarize: async () => {
      const active = eq(followUps.status, "active");
      const [row] = await database.select({
        overdue: sql<number>`count(*) filter (where ${active} and ${lt(followUps.dueAt, sql`now()`)})::int`,
        next7Days: sql<number>`count(*) filter (where ${active} and ${gte(followUps.dueAt, sql`now()`)} and ${lt(followUps.dueAt, inSevenDays)})::int`,
        later: sql<number>`count(*) filter (where ${active} and ${gte(followUps.dueAt, inSevenDays)})::int`,
        noDate: sql<number>`count(*) filter (where ${active} and ${isNull(followUps.dueAt)})::int`
      }).from(followUps);
      return row ?? { overdue: 0, next7Days: 0, later: 0, noDate: 0 };
    },

    /** An open follow-up on this prospect for the same reason, ignoring case, so asking twice returns the first. */
    findOpenByReason: async (prospectId: string, reason: string) => {
      const [row] = await database.select({ id: followUps.id }).from(followUps)
        .where(and(eq(followUps.prospectId, prospectId), eq(followUps.status, "active"), sql`lower(${followUps.reason}) = ${reason.toLowerCase()}`))
        .limit(1);
      return row ?? null;
    },

    /** The prospect a message belongs to, to check a follow-up's origin is the same prospect's. */
    findMessageProspect: async (id: string) => {
      const [row] = await database.select({ prospectId: outreachMessages.prospectId }).from(outreachMessages).where(eq(outreachMessages.id, id)).limit(1);
      return row?.prospectId ?? null;
    },

    findInteractionProspect: async (id: string) => {
      const [row] = await database.select({ prospectId: interactions.prospectId }).from(interactions).where(eq(interactions.id, id)).limit(1);
      return row?.prospectId ?? null;
    }
  };
}

export type FollowUpRepository = ReturnType<typeof createFollowUpRepository>;
