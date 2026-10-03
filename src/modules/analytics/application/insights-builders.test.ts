import { describe, expect, it } from "vitest";
import { toBounceRate, toDeliverability, toFunnel, toPerformanceRows, toReplyRate, toResponseTime } from "@/modules/analytics/application/insights-builders";

describe("toFunnel", () => {
  it("lists the steps in order and keeps won apart, since it is an outcome and not a further step", () => {
    expect(toFunnel({ reached: 10, replied: 4, engaged: 3, conversation: 1, commercial: 0, won: 2 })).toEqual({
      steps: [{ step: "reached", prospects: 10 }, { step: "replied", prospects: 4 }, { step: "engaged", prospects: 3 }, { step: "conversation", prospects: 1 }, { step: "commercial", prospects: 0 }],
      won: 2
    });
  });
});

describe("toResponseTime", () => {
  it("turns running totals ('faster than N') into how many replies fell in each band, ending with everything slower", () => {
    const { buckets, sample, medianHours } = toResponseTime({ sample: 10, medianHours: 5.5, withinHour: 2, withinDay: 6, withinThreeDays: 8, withinWeek: 9 });

    expect(buckets).toEqual([{ bucket: "hour", replies: 2 }, { bucket: "day", replies: 4 }, { bucket: "three_days", replies: 2 }, { bucket: "week", replies: 1 }, { bucket: "later", replies: 1 }]);
    expect(buckets.reduce((total, band) => total + band.replies, 0)).toBe(sample);
    expect(medianHours).toBe(5.5);
  });

  it("has no median and empty bands when nothing was answered", () => {
    const { buckets, medianHours } = toResponseTime({ sample: 0, medianHours: null, withinHour: 0, withinDay: 0, withinThreeDays: 0, withinWeek: 0 });

    expect(medianHours).toBeNull();
    expect(buckets.every((band) => band.replies === 0)).toBe(true);
  });
});

describe("toDeliverability", () => {
  it("counts what was neither confirmed nor failed as unconfirmed", () => {
    expect(toDeliverability({ sent: 10, delivered: 3, failed: 1, soft: 1, hard: 1, blocked: 0 })).toEqual({ sent: 10, delivered: 3, failed: 1, unconfirmed: 6, bounces: { soft: 1, hard: 1, blocked: 0 } });
  });
});

describe("rates", () => {
  const windows = { current: { replied: 2, reached: 8, emailBounced: 1, emailSent: 5 }, previous: { replied: 0, reached: 0, emailBounced: 0, emailSent: 0 } };

  it("states a reply rate as prospects replied out of prospects reached, and a bounce rate as bounces out of emails", () => {
    expect(toReplyRate(windows)).toEqual({ current: { part: 2, whole: 8 }, previous: { part: 0, whole: 0 } });
    expect(toBounceRate(windows)).toEqual({ current: { part: 1, whole: 5 }, previous: { part: 0, whole: 0 } });
  });
});

describe("toPerformanceRows", () => {
  it("lifts the group count the database repeats on every row out of the rows", () => {
    const row = { key: "r1", name: "Agencies", sent: 3, reached: 2, repliedProspects: 1, repliedMessages: 1, bounced: 0 };
    const result = toPerformanceRows([{ ...row, groups: 7 }, { ...row, key: "r2", groups: 7 }]);

    expect(result.groups).toBe(7);
    expect(result.rows[0]).toEqual(row);
    expect(result.rows[0]).not.toHaveProperty("groups");
  });

  it("is empty when there is nothing", () => {
    expect(toPerformanceRows([])).toEqual({ rows: [], groups: 0 });
  });
});
