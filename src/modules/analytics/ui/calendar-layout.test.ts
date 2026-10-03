import { describe, expect, it } from "vitest";
import { layoutCalendar } from "@/modules/analytics/ui/calendar-layout";

const day = (date: string, sent = 0) => ({ date, sent, replies: 0 });

describe("layoutCalendar", () => {
  it("lays days out in Monday-first weeks, padding the first week so weekdays line up", () => {
    // 2026-09-30 is a Wednesday.
    const { weeks } = layoutCalendar([day("2026-09-30"), day("2026-10-01"), day("2026-10-02")]);

    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.map((cell) => cell?.date ?? null)).toEqual([null, null, "2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("scales shades to the busiest day, leaving quiet days empty", () => {
    const { weeks } = layoutCalendar([day("2026-09-28", 1), day("2026-09-29", 2), day("2026-09-30", 4), day("2026-10-01")]);
    expect(weeks[0]?.map((cell) => cell?.level)).toEqual([1, 2, 4, 0]);
  });

  it("labels a month above the first column that starts in it, and reports totals, the busiest day and the streak", () => {
    const layout = layoutCalendar([day("2026-09-28", 1), day("2026-09-29", 3), day("2026-09-30", 1), day("2026-10-01", 2), day("2026-10-02"), day("2026-10-03"), day("2026-10-04"), day("2026-10-05", 1)]);

    expect(layout.months).toEqual([{ week: 0, label: "Sep" }, { week: 1, label: "Oct" }]);
    expect(layout).toMatchObject({ activeDays: 5, total: 8, streak: 1, busiest: { date: "2026-09-29", sent: 3 } });
  });

  it("keeps a streak alive through a day that is not over yet, but not through an earlier gap", () => {
    expect(layoutCalendar([day("2026-09-29", 1), day("2026-09-30", 1), day("2026-10-01")]).streak).toBe(2);
    expect(layoutCalendar([day("2026-09-28", 1), day("2026-09-29"), day("2026-09-30", 1), day("2026-10-01", 1)]).streak).toBe(2);
  });

  it("copes with no days at all", () => {
    expect(layoutCalendar([])).toMatchObject({ weeks: [], activeDays: 0, total: 0, busiest: null, streak: 0 });
  });
});
