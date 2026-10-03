import { describe, expect, it } from "vitest";
import { calendarDays, overviewWindow } from "@/modules/analytics/domain/overview-window";

const now = new Date("2026-10-01T15:30:00.000Z");

describe("overviewWindow", () => {
  it("adds the 26-week calendar to the period, ending on the same day", () => {
    const { from, calendarFrom } = overviewWindow("7d", now);

    expect(from.toISOString()).toBe("2026-09-25T00:00:00.000Z");
    expect(calendarFrom.toISOString()).toBe("2026-04-03T00:00:00.000Z");
  });

  it("never lets the longest comparison reach back further than the calendar shows", () => {
    expect(2 * overviewWindow("90d", now).days).toBeLessThanOrEqual(calendarDays);
  });
});
