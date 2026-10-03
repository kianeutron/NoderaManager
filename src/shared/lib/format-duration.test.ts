import { describe, expect, it } from "vitest";
import { formatHours } from "@/shared/lib/format-duration";

describe("formatHours", () => {
  it("speaks in minutes under an hour, hours under a day and days beyond", () => {
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(0.001)).toBe("1 min");
    expect(formatHours(4.54)).toBe("4.5 h");
    expect(formatHours(12)).toBe("12 h");
    expect(formatHours(24)).toBe("1 day");
    expect(formatHours(55)).toBe("2.3 days");
  });
});
