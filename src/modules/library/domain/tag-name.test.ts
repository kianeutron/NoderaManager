import { describe, expect, it } from "vitest";
import { tagListSchema } from "@/modules/library/domain/tag-name";

describe("tag list schema", () => {
  it("trims, collapses whitespace and keeps the first spelling of case-insensitive duplicates", () => {
    expect(tagListSchema.parse(["  Q3   Deck ", "q3 deck", "Pitch", "PITCH"])).toEqual(["Q3 Deck", "Pitch"]);
  });

  it("counts the limit after removing duplicates", () => {
    const eleven = Array.from({ length: 11 }, (_, index) => `tag ${index}`);

    expect(tagListSchema.safeParse(eleven).success).toBe(false);
    expect(tagListSchema.safeParse([...eleven.slice(0, 10), "TAG 0"]).success).toBe(true);
  });

  it.each([[""], ["   "], ["x".repeat(41)]])("rejects the tag %j", (name) => {
    expect(tagListSchema.safeParse([name]).success).toBe(false);
  });
});
