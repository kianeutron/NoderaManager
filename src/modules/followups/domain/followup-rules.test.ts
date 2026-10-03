import { describe, expect, it } from "vitest";
import { assertActive, assertDatesInOrder } from "@/modules/followups/domain/followup-rules";

describe("assertDatesInOrder", () => {
  const earlier = new Date("2026-10-01T00:00:00Z");
  const later = new Date("2026-11-01T00:00:00Z");

  it("accepts a not-before date on or before the due date, or either one missing", () => {
    expect(() => assertDatesInOrder(earlier, later)).not.toThrow();
    expect(() => assertDatesInOrder(later, later)).not.toThrow();
    expect(() => assertDatesInOrder(null, later)).not.toThrow();
    expect(() => assertDatesInOrder(earlier, null)).not.toThrow();
    expect(() => assertDatesInOrder(null, null)).not.toThrow();
  });

  it("refuses a not-before date after the due date", () => {
    expect(() => assertDatesInOrder(later, earlier)).toThrowError(expect.objectContaining({ code: "conflict", reason: "follow_up_dates_invalid" }));
  });
});

describe("assertActive", () => {
  it("lets an active follow-up change and refuses a finished one", () => {
    expect(() => assertActive("active")).not.toThrow();
    for (const status of ["completed", "dismissed"] as const) expect(() => assertActive(status)).toThrowError(expect.objectContaining({ reason: "follow_up_finished" }));
  });
});
