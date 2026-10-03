import { and, desc, eq, gte, isNotNull, sql, type SQL } from "drizzle-orm";
import { deepestResponse, isBounced, isReplied, type AnalyticsDatabase } from "@/modules/analytics/data/sql-fragments";
import { funnelDepth, responseTimeLimitHours } from "@/modules/analytics/domain/analytics-values";
import type { PerformanceDimension } from "@/modules/analytics/domain/analytics.schema";
import { organizations, people, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { interactions, outreachMessages } from "@/shared/db/schema/engagement";
import { campaigns } from "@/shared/db/schema/strategy";

/**
 * How each dimension is read from a message. These are the only expressions a caller can select, so a dimension is a
 * choice from this list and never text that reaches SQL. A person's country wins over their company's. `name` is only
 * set for dimensions that are records (a route's name); the others are worded by the screen from their key.
 */
const dimensions = {
  route: { key: sql<string | null>`${outreachMessages.routeId}::text`, name: sql<string | null>`${routes.name}` },
  module: { key: sql<string | null>`${outreachMessages.routeModuleId}::text`, name: sql<string | null>`case when ${routeModules.id} is null then null else ${routes.name} || ' / ' || ${routeModules.name} end` },
  persona: { key: sql<string | null>`${people.persona}::text`, name: null },
  country: { key: sql<string | null>`coalesce(${people.countryCode}, ${organizations.countryCode})`, name: null },
  organizationType: { key: sql<string | null>`${organizations.organizationType}::text`, name: null },
  channel: { key: sql<string | null>`${outreachMessages.channel}::text`, name: null },
  campaign: { key: sql<string | null>`${outreachMessages.campaignId}::text`, name: sql<string | null>`${campaigns.name}` },
  source: { key: sql<string | null>`${prospects.source}::text`, name: null }
} as const satisfies Record<PerformanceDimension, { key: SQL; name: SQL | null }>;

const sentSince = (from: Date) => gte(outreachMessages.sentAt, from);

/** Read-only aggregates behind the Analytics page. Every one is bounded by the window and answered by the database, never by loading rows. */
export function createPerformanceRepository(database: AnalyticsDatabase) {
  return {
    /**
     * Messages in the window grouped by one dimension, biggest first. Unused joins cost nothing: each is on a unique key
     * and the planner drops a left join whose columns are not read.
     */
    breakdown: ({ dimension, from, limit }: Readonly<{ dimension: PerformanceDimension; from: Date; limit: number }>) => {
      const { key, name } = dimensions[dimension];
      return database.select({
        key, name: name ?? sql<string | null>`null::text`,
        sent: sql<number>`count(*)::int`,
        reached: sql<number>`count(distinct ${outreachMessages.prospectId})::int`,
        repliedProspects: sql<number>`count(distinct ${outreachMessages.prospectId}) filter (where ${isReplied})::int`,
        repliedMessages: sql<number>`count(*) filter (where ${isReplied})::int`,
        bounced: sql<number>`count(*) filter (where ${isBounced})::int`,
        groups: sql<number>`count(*) over ()::int`
      }).from(outreachMessages)
        .leftJoin(prospects, eq(prospects.id, outreachMessages.prospectId))
        .leftJoin(people, eq(people.id, outreachMessages.personId))
        .leftJoin(organizations, eq(organizations.id, outreachMessages.organizationId))
        .leftJoin(routes, eq(routes.id, outreachMessages.routeId))
        .leftJoin(routeModules, eq(routeModules.id, outreachMessages.routeModuleId))
        .leftJoin(campaigns, eq(campaigns.id, outreachMessages.campaignId))
        .where(sentSince(from))
        .groupBy(...(name ? [key, name] : [key]))
        .orderBy(desc(sql`count(*)`), key)
        .limit(limit);
    },

    /** Prospects messaged in the window, and how many of them got each step further. */
    funnel: async (from: Date) => {
      const cohort = database.select({ prospectId: outreachMessages.prospectId, replied: sql<boolean>`bool_or(${isReplied})`.as("replied") })
        .from(outreachMessages).where(sentSince(from)).groupBy(outreachMessages.prospectId).as("cohort");
      const deepest = deepestResponse(database);
      const deeper = (depth: number) => sql<number>`count(*) filter (where ${cohort.replied} and ${deepest.depth} >= ${depth})::int`;
      const [row] = await database.select({
        reached: sql<number>`count(*)::int`,
        replied: sql<number>`count(*) filter (where ${cohort.replied})::int`,
        engaged: deeper(funnelDepth.engaged),
        conversation: deeper(funnelDepth.conversation),
        commercial: deeper(funnelDepth.commercial),
        won: sql<number>`count(*) filter (where ${prospects.status} = 'won')::int`
      }).from(cohort).innerJoin(prospects, eq(prospects.id, cohort.prospectId)).leftJoin(deepest, eq(deepest.prospectId, cohort.prospectId));
      return row ?? { reached: 0, replied: 0, engaged: 0, conversation: 0, commercial: 0, won: 0 };
    },

    /** How long the first real reply took for messages sent in the window that were answered. */
    responseTimes: async (from: Date) => {
      const firstReply = database.select({ messageId: interactions.outreachMessageId, repliedAt: sql<Date>`min(${interactions.occurredAt})`.as("replied_at") })
        .from(interactions).where(and(eq(interactions.direction, "inbound"), eq(interactions.type, "reply"), isNotNull(interactions.outreachMessageId)))
        .groupBy(interactions.outreachMessageId).as("first_reply");
      // A reply logged with a time before the send (a data slip) counts as instant rather than negative.
      const hours = sql`greatest(0, extract(epoch from (${firstReply.repliedAt} - ${outreachMessages.sentAt})) / 3600)`;
      const within = (limit: number) => sql<number>`count(*) filter (where ${hours} < ${limit})::int`;
      const [row] = await database.select({
        sample: sql<number>`count(*)::int`,
        medianHours: sql<number | null>`percentile_cont(0.5) within group (order by ${hours})::float8`,
        withinHour: within(responseTimeLimitHours.hour),
        withinDay: within(responseTimeLimitHours.day),
        withinThreeDays: within(responseTimeLimitHours.three_days),
        withinWeek: within(responseTimeLimitHours.week)
      }).from(outreachMessages).innerJoin(firstReply, eq(firstReply.messageId, outreachMessages.id)).where(sentSince(from));
      return row ?? { sample: 0, medianHours: null, withinHour: 0, withinDay: 0, withinThreeDays: 0, withinWeek: 0 };
    },

    /** Messages and answered messages for each weekday and hour (UTC) in which anything was sent. */
    sendTimes: (from: Date) => {
      const weekday = sql<number>`extract(isodow from ${outreachMessages.sentAt} at time zone 'UTC')::int`;
      const hour = sql<number>`extract(hour from ${outreachMessages.sentAt} at time zone 'UTC')::int`;
      return database.select({ weekday, hour, sent: sql<number>`count(*)::int`, replied: sql<number>`count(*) filter (where ${isReplied})::int` })
        .from(outreachMessages).where(sentSince(from)).groupBy(weekday, hour);
    },

    deliverability: async (from: Date) => {
      const bounce = (kind: "soft" | "hard" | "blocked") => sql<number>`count(*) filter (where ${eq(outreachMessages.bounceStatus, kind)})::int`;
      const [row] = await database.select({
        sent: sql<number>`count(*)::int`,
        delivered: sql<number>`count(*) filter (where ${eq(outreachMessages.deliveryStatus, "delivered")})::int`,
        failed: sql<number>`count(*) filter (where ${eq(outreachMessages.deliveryStatus, "failed")})::int`,
        soft: bounce("soft"), hard: bounce("hard"), blocked: bounce("blocked")
      }).from(outreachMessages).where(sentSince(from));
      return row ?? { sent: 0, delivered: 0, failed: 0, soft: 0, hard: 0, blocked: 0 };
    }
  };
}

export type PerformanceRepository = ReturnType<typeof createPerformanceRepository>;
