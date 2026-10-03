import type { Insights, PerformanceBreakdown } from "@/modules/analytics/domain/analytics.types";

/** A small, believable analytics result for component tests. Override only what a test is about. */
export function insightsFixture(overrides: Partial<Insights> = {}): Insights {
  return {
    range: "90d", days: 90, granularity: "day", from: "2026-07-04", to: "2026-10-01",
    totals: {
      sent: { current: 40, previous: 20 },
      reached: { current: 25, previous: 20 },
      replyRate: { current: { part: 5, whole: 25 }, previous: { part: 2, whole: 20 } },
      bounceRate: { current: { part: 2, whole: 30 }, previous: { part: 1, whole: 10 } }
    },
    trend: [{ date: "2026-09-30", sent: 4, replies: 1 }, { date: "2026-10-01", sent: 2, replies: 0 }],
    funnel: { steps: [{ step: "reached", prospects: 25 }, { step: "replied", prospects: 5 }, { step: "engaged", prospects: 2 }, { step: "conversation", prospects: 1 }, { step: "commercial", prospects: 0 }], won: 1 },
    responseTime: { sample: 5, medianHours: 30, buckets: [{ bucket: "hour", replies: 1 }, { bucket: "day", replies: 1 }, { bucket: "three_days", replies: 2 }, { bucket: "week", replies: 1 }, { bucket: "later", replies: 0 }] },
    sendTimes: [{ weekday: 2, hour: 9, sent: 10, replied: 5 }, { weekday: 3, hour: 14, sent: 4, replied: 1 }, { weekday: 5, hour: 8, sent: 1, replied: 1 }],
    deliverability: { sent: 40, delivered: 10, failed: 1, unconfirmed: 29, bounces: { soft: 1, hard: 1, blocked: 0 } },
    ...overrides
  };
}

export function breakdownFixture(overrides: Partial<PerformanceBreakdown> = {}): PerformanceBreakdown {
  return {
    range: "90d", days: 90, from: "2026-07-04", to: "2026-10-01", dimension: "route", groups: 2,
    rows: [
      { key: "r1", name: "Agency Overflow", sent: 30, reached: 20, repliedProspects: 5, repliedMessages: 5, bounced: 1 },
      { key: "r2", name: "Recruiters", sent: 8, reached: 5, repliedProspects: 3, repliedMessages: 3, bounced: 0 }
    ],
    ...overrides
  };
}
