import { describe, expect, it } from "vitest";
import { changeBetween, formatPercent, shareOf } from "@/shared/ui/charts/percent-change";

describe("changeBetween", () => {
  it("rounds the move to whole percent and names its direction", () => {
    expect(changeBetween(15, 10)).toEqual({ direction: "up", percent: 50 });
    expect(changeBetween(7, 10)).toEqual({ direction: "down", percent: 30 });
  });

  it("calls the same figure flat, and a first-ever figure new rather than infinite", () => {
    expect(changeBetween(0, 0)).toEqual({ direction: "flat", percent: 0 });
    expect(changeBetween(4, 4).direction).toBe("flat");
    expect(changeBetween(3, 0)).toEqual({ direction: "new", percent: 0 });
  });
});

describe("shareOf", () => {
  it("is zero when there is nothing to divide and never leaves 0 to 1", () => {
    expect(shareOf(1, 0)).toBe(0);
    expect(shareOf(3, 2)).toBe(1);
    expect(shareOf(1, 4)).toBe(0.25);
    expect(formatPercent(0.256)).toBe("26%");
  });
});
