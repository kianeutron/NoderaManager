import type { ActivityRepository } from "@/modules/analytics/data/activity.repository";
import type { PerformanceRepository } from "@/modules/analytics/data/performance.repository";
import type { InsightsQuery } from "@/modules/analytics/domain/analytics.schema";
import type { Insights } from "@/modules/analytics/domain/analytics.types";
import { fillBuckets, granularityFor, mergeBuckets, periodWindow, utcDay } from "@/modules/analytics/domain/period-window";
import { toBounceRate, toDeliverability, toFunnel, toReplyRate, toResponseTime } from "@/modules/analytics/application/insights-builders";

export type InsightsDependencies = Readonly<{ activity: ActivityRepository; performance: PerformanceRepository }>;

/** The deeper look behind the overview: trend, funnel, response time, best send times and deliverability for one window. */
export async function getInsights({ activity, performance }: InsightsDependencies, { range }: InsightsQuery, now = new Date()): Promise<Insights> {
  const window = periodWindow(range, now);
  const granularity = granularityFor(window.days);

  const [sentRows, replyRows, totals, funnel, responseTime, sendTimes, deliverability] = await Promise.all([
    activity.sentByBucket(window.from, granularity),
    activity.repliesByBucket(window.from, granularity),
    activity.periodTotals(window),
    performance.funnel(window.from),
    performance.responseTimes(window.from),
    performance.sendTimes(window.from),
    performance.deliverability(window.from)
  ]);

  return {
    range, days: window.days, granularity, from: utcDay(window.from), to: utcDay(now),
    totals: {
      sent: { current: totals.current.sent, previous: totals.previous.sent },
      reached: { current: totals.current.reached, previous: totals.previous.reached },
      replyRate: toReplyRate(totals),
      bounceRate: toBounceRate(totals)
    },
    trend: fillBuckets(mergeBuckets(sentRows, replyRows), window.from, now, granularity),
    funnel: toFunnel(funnel),
    responseTime: toResponseTime(responseTime),
    sendTimes,
    deliverability: toDeliverability(deliverability)
  };
}
