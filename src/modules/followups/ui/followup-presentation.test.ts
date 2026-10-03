import { describe, expect, it } from "vitest";
import { describeDue, isOverdue } from "@/modules/followups/ui/followup-presentation";

const now = new Date("2026-09-30T12:00:00Z");
const at = (offsetHours: number) => new Date(now.getTime() + offsetHours * 60 * 60 * 1000).toISOString();

describe("describeDue", () => {
  it.each([
    [null, "No date"],
    [at(-2), "Overdue"],
    [at(-24 * 3 - 1), "Overdue by 3 days"],
    [at(-24 - 1), "Overdue by 1 day"],
    [at(5), "Due within a day"],
    [at(24 * 5), "Due in 5 days"],
    [at(25), "Due in 2 days"]
  ])("%s -> %s", (dueAt, expected) => {
    expect(describeDue(dueAt, now)).toBe(expected);
  });
});

describe("isOverdue", () => {
  it("is true only for a date in the past", () => {
    expect(isOverdue(at(-1), now)).toBe(true);
    expect(isOverdue(at(1), now)).toBe(false);
    expect(isOverdue(null, now)).toBe(false);
  });
});
