import { describe, expect, it } from "vitest";
import { shouldSkipFrame } from "@/shared/ui/backgrounds/frame-gate";

describe("shouldSkipFrame", () => {
  it("draws at most the given number of frames a second", () => {
    expect(shouldSkipFrame(1000, 990, 30)).toBe(true);
    expect(shouldSkipFrame(1000, 960, 30)).toBe(false);
  });

  it("draws the very first frame", () => {
    expect(shouldSkipFrame(16, Number.NEGATIVE_INFINITY, 30)).toBe(false);
  });

  it("waits while the user is scrolling, and resumes shortly after", () => {
    document.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    const scrolledAt = performance.now();

    expect(shouldSkipFrame(scrolledAt + 10, 0, 30)).toBe(true);
    expect(shouldSkipFrame(scrolledAt + 400, 0, 30)).toBe(false);
  });
});
