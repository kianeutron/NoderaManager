import { describe, expect, it, vi } from "vitest";
import { getInsights, type InsightsDependencies } from "@/modules/analytics/application/get-insights.service";

const now = new Date("2026-10-01T12:00:00.000Z");
const side = { sent: 0, reached: 0, replied: 0, emailSent: 0, emailBounced: 0 };

function dependencies() {
  return {
    activity: {
      sentByBucket: vi.fn().mockResolvedValue([{ day: "2026-09-30", count: 3 }]),
      repliesByBucket: vi.fn().mockResolvedValue([{ day: "2026-09-30", count: 1 }]),
      periodTotals: vi.fn().mockResolvedValue({ current: { sent: 12, reached: 6, replied: 2, emailSent: 8, emailBounced: 1 }, previous: { ...side, sent: 6, reached: 3 } })
    },
    performance: {
      funnel: vi.fn().mockResolvedValue({ reached: 6, replied: 2, engaged: 1, conversation: 0, commercial: 0, won: 0 }),
      responseTimes: vi.fn().mockResolvedValue({ sample: 2, medianHours: 4, withinHour: 0, withinDay: 2, withinThreeDays: 2, withinWeek: 2 }),
      sendTimes: vi.fn().mockResolvedValue([{ weekday: 3, hour: 9, sent: 2, replied: 1 }]),
      deliverability: vi.fn().mockResolvedValue({ sent: 12, delivered: 0, failed: 0, soft: 0, hard: 1, blocked: 0 })
    }
  };
}
const asDependencies = (deps: ReturnType<typeof dependencies>) => deps as unknown as InsightsDependencies;

describe("getInsights", () => {
  it("compares the window with the one before and states every rate with its counts", async () => {
    const insights = await getInsights(asDependencies(dependencies()), { range: "30d" }, now);

    expect(insights).toMatchObject({ range: "30d", days: 30, granularity: "day", from: "2026-09-02", to: "2026-10-01" });
    expect(insights.totals.sent).toEqual({ current: 12, previous: 6 });
    expect(insights.totals.replyRate.current).toEqual({ part: 2, whole: 6 });
    expect(insights.totals.bounceRate.current).toEqual({ part: 1, whole: 8 });
    expect(insights.deliverability.unconfirmed).toBe(12);
  });

  it("fills a point for every day of a short window, and every week of a long one", async () => {
    const short = await getInsights(asDependencies(dependencies()), { range: "30d" }, now);
    expect(short.trend).toHaveLength(30);
    expect(short.trend.at(-2)).toEqual({ date: "2026-09-30", sent: 3, replies: 1 });

    const deps = dependencies();
    const long = await getInsights(asDependencies(deps), { range: "365d" }, now);
    expect(long.granularity).toBe("week");
    expect(deps.activity.sentByBucket).toHaveBeenCalledWith(new Date("2025-10-02T00:00:00.000Z"), "week");
    expect(long.trend.length).toBeGreaterThanOrEqual(52);
    expect(long.trend.length).toBeLessThanOrEqual(54);
  });

  it("measures every aggregate over the same window start", async () => {
    const deps = dependencies();
    await getInsights(asDependencies(deps), { range: "90d" }, now);
    const from = new Date("2026-07-04T00:00:00.000Z");

    expect(deps.performance.funnel).toHaveBeenCalledWith(from);
    expect(deps.performance.responseTimes).toHaveBeenCalledWith(from);
    expect(deps.performance.sendTimes).toHaveBeenCalledWith(from);
    expect(deps.performance.deliverability).toHaveBeenCalledWith(from);
    expect(deps.activity.periodTotals).toHaveBeenCalledWith(expect.objectContaining({ from, previousFrom: new Date("2026-04-05T00:00:00.000Z") }));
  });
});
