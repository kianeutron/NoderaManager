import { describe, expect, it } from "vitest";
import { heatLevel } from "@/shared/ui/charts/heat-scale";

describe("heatLevel", () => {
  it("scales to the peak in four steps above empty", () => {
    expect([0, 1, 2, 3, 4].map((value) => heatLevel(value, 4))).toEqual([0, 1, 2, 3, 4]);
    expect(heatLevel(5, 10)).toBe(2);
  });

  it("keeps anything that happened visible, and nothing is shaded when there is no peak", () => {
    expect(heatLevel(1, 1000)).toBe(1);
    expect(heatLevel(3, 0)).toBe(0);
    expect(heatLevel(-1, 4)).toBe(0);
  });
});
