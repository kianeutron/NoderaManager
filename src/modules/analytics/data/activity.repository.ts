import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { isBounced, isReplied, utcBucket, type AnalyticsDatabase } from "@/modules/analytics/data/sql-fragments";
import type { Granularity } from "@/modules/analytics/domain/period-window";
import { interactions, outreachMessages } from "@/shared/db/schema/engagement";

type Windows = Readonly<{ from: Date; previousFrom: Date }>;

/** What both pages measure in the same way: messages and replies over time, and headline totals per window. */
export function createActivityRepository(database: AnalyticsDatabase) {
  return {
    /** Each message is attributed to the bucket it was sent in. */
    sentByBucket: (from: Date, granularity: Granularity) => {
      const bucket = utcBucket(outreachMessages.sentAt, granularity);
      return database.select({ day: bucket, count: count() }).from(outreachMessages).where(gte(outreachMessages.sentAt, from)).groupBy(bucket);
    },

    /** Each real reply is attributed to the bucket it arrived in. */
    repliesByBucket: (from: Date, granularity: Granularity) => {
      const bucket = utcBucket(interactions.occurredAt, granularity);
      return database.select({ day: bucket, count: count() }).from(interactions)
        .where(and(gte(interactions.occurredAt, from), eq(interactions.direction, "inbound"), eq(interactions.type, "reply")))
        .groupBy(bucket);
    },

    /** The headline counts for the window and for the one before it, in one pass over the messages. */
    periodTotals: async ({ from, previousFrom }: Windows) => {
      const inCurrent = gte(outreachMessages.sentAt, from);
      const inPrevious = and(gte(outreachMessages.sentAt, previousFrom), lt(outreachMessages.sentAt, from));
      const email = eq(outreachMessages.channel, "email");
      const totalsOf = (window: ReturnType<typeof and>) => ({
        sent: sql<number>`count(*) filter (where ${window})::int`,
        reached: sql<number>`count(distinct ${outreachMessages.prospectId}) filter (where ${window})::int`,
        replied: sql<number>`count(distinct ${outreachMessages.prospectId}) filter (where ${window} and ${isReplied})::int`,
        emailSent: sql<number>`count(*) filter (where ${window} and ${email})::int`,
        emailBounced: sql<number>`count(*) filter (where ${window} and ${email} and ${isBounced})::int`
      });
      const empty = { sent: 0, reached: 0, replied: 0, emailSent: 0, emailBounced: 0 };
      const [row] = await database.select({ current: totalsOf(inCurrent), previous: totalsOf(inPrevious) }).from(outreachMessages).where(gte(outreachMessages.sentAt, previousFrom));
      return row ?? { current: empty, previous: empty };
    }
  };
}

export type ActivityRepository = ReturnType<typeof createActivityRepository>;
