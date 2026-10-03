import { describe, expect, it } from "vitest";
import { blankToUndefined, definedEntries, diffList, diffText } from "@/shared/ui/form/form-values";

describe("form values", () => {
  it("treats blank as not provided", () => {
    expect(blankToUndefined("  ")).toBeUndefined();
    expect(blankToUndefined(" x ")).toBe("x");
  });

  it("diffs text: unchanged, cleared or replaced", () => {
    expect(diffText("CTO ", "CTO")).toBeUndefined();
    expect(diffText("", "CTO")).toBeNull();
    expect(diffText("CEO", "CTO")).toBe("CEO");
    expect(diffText("", "")).toBeUndefined();
  });

  it("diffs lists by order and content", () => {
    expect(diffList(["a", "b"], ["a", "b"])).toBeUndefined();
    expect(diffList(["b", "a"], ["a", "b"])).toEqual(["b", "a"]);
    expect(diffList([], ["a"])).toEqual([]);
  });

  it("keeps null but drops undefined", () => {
    expect(definedEntries({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
  });
});
