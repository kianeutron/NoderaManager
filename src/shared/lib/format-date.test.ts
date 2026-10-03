import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, toDateTimeLocalValue } from "@/shared/lib/format-date";

describe("date formatting", () => {
  it("formats a date and a date with time", () => {
    expect(formatDate("2026-09-30T12:00:00Z")).toMatch(/2026/);
    expect(formatDateTime("2026-09-30T12:00:00Z")).toMatch(/2026.*\d{1,2}:\d{2}/);
  });

  it("gives a datetime-local value in local time, to the minute", () => {
    const date = new Date(2026, 8, 30, 14, 5, 59);
    expect(toDateTimeLocalValue(date)).toBe("2026-09-30T14:05");
  });
});
