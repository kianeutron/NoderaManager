import { eq, sql, type AnyColumn } from "drizzle-orm";
import type { getDatabase } from "@/shared/db/client";
import { interactions, outreachMessages } from "@/shared/db/schema/engagement";
import type { Granularity } from "@/modules/analytics/domain/period-window";

export type AnalyticsDatabase = ReturnType<typeof getDatabase>;

// A fixed lookup, so only these two literals can ever be written into the statement.
const truncationUnit = { day: sql`'day'`, week: sql`'week'` } as const satisfies Record<Granularity, unknown>;

/** The UTC day, or the Monday of the UTC week, of a timestamp, as `YYYY-MM-DD`. */
export const utcBucket = (column: AnyColumn, granularity: Granularity) => sql<string>`to_char(date_trunc(${truncationUnit[granularity]}, ${column} at time zone 'UTC'), 'YYYY-MM-DD')`;

export const isReplied = eq(outreachMessages.replyStatus, "replied");
export const isBounced = sql`${outreachMessages.bounceStatus} <> 'none'`;

/** Each prospect once, at the deepest step of any reply you classified. */
export const deepestResponse = (database: AnalyticsDatabase) => database
  .select({ prospectId: interactions.prospectId, depth: sql<number>`max(${interactions.responseDepth})`.as("depth") })
  .from(interactions).where(sql`${interactions.responseDepth} is not null`).groupBy(interactions.prospectId).as("deepest");
