import { describe, expect, it } from "vitest";
import { fillBuckets, granularityFor, mergeBuckets, periodWindow, sumOf } from "@/modules/analytics/domain/period-window";

const now = new Date("2026-10-01T15:30:00.000Z");

describe("periodWindow", () => {
  it("starts the window at the first UTC midnight that makes it exactly N days long, today included", () => {
    const { days, from, previousFrom } = periodWindow("7d", now);

    expect(days).toBe(7);
    expect(from.toISOString()).toBe("2026-09-25T00:00:00.000Z");
    expect(previousFrom.toISOString()).toBe("2026-09-18T00:00:00.000Z");
  });

  it("covers a year, with the year before it", () => {
    const { days, from, previousFrom } = periodWindow("365d", now);

    expect(days).toBe(365);
    expect(from.toISOString()).toBe("2025-10-02T00:00:00.000Z");
    expect(previousFrom.toISOString()).toBe("2024-10-02T00:00:00.000Z");
  });
});

describe("granularityFor", () => {
  it("shows up to three months per day and anything longer per week", () => {
    expect([7, 30, 90, 180, 365].map(granularityFor)).toEqual(["day", "day", "day", "week", "week"]);
  });
});

describe("fillBuckets", () => {
  it("gives every day a point, zeros for quiet ones, and ends on today", () => {
    const points = fillBuckets([{ date: "2026-09-30", sent: 2, replies: 1 }], new Date("2026-09-29T00:00:00.000Z"), now, "day");

    expect(points).toEqual([
      { date: "2026-09-29", sent: 0, replies: 0 },
      { date: "2026-09-30", sent: 2, replies: 1 },
      { date: "2026-10-01", sent: 0, replies: 0 }
    ]);
  });

  it("starts each week on its Monday, so a bucket from the database always finds its point", () => {
    // 2026-09-30 is a Wednesday; its week starts Monday 2026-09-28.
    const points = fillBuckets([{ date: "2026-09-28", sent: 4, replies: 1 }, { date: "2026-10-05", sent: 1, replies: 0 }], new Date("2026-09-30T00:00:00.000Z"), new Date("2026-10-07T12:00:00.000Z"), "week");

    expect(points).toEqual([{ date: "2026-09-28", sent: 4, replies: 1 }, { date: "2026-10-05", sent: 1, replies: 0 }]);
  });

  it("treats a Sunday as the end of its week, not the start of the next", () => {
    const points = fillBuckets([], new Date("2026-10-04T00:00:00.000Z"), new Date("2026-10-04T12:00:00.000Z"), "week");
    expect(points.map((point) => point.date)).toEqual(["2026-09-28"]);
  });
});

describe("mergeBuckets", () => {
  it("joins the sent and reply counts of the same bucket and keeps buckets that only have one of them", () => {
    const merged = mergeBuckets([{ day: "2026-09-30", count: 3 }], [{ day: "2026-09-30", count: 1 }, { day: "2026-09-29", count: 2 }]);

    expect(merged).toEqual(expect.arrayContaining([{ date: "2026-09-30", sent: 3, replies: 1 }, { date: "2026-09-29", sent: 0, replies: 2 }]));
    expect(merged).toHaveLength(2);
  });
});

describe("sumOf", () => {
  it("adds one kind of count over the points", () => {
    expect(sumOf([{ date: "a", sent: 2, replies: 1 }, { date: "b", sent: 3, replies: 0 }], "sent")).toBe(5);
  });
});
