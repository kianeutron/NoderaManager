import { describe, expect, it } from "vitest";
import { mergeKeysetPages } from "@/shared/lib/merge-keyset-pages";

const item = (id: string) => ({ id });

describe("mergeKeysetPages", () => {
  it("concatenates pages in order and takes the total from the first page", () => {
    const merged = mergeKeysetPages([{ items: [item("a"), item("b")], total: 3, nextCursor: "next" }, { items: [item("c")], total: null, nextCursor: null }]);

    expect(merged.items.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    expect(merged.total).toBe(3);
  });

  it("drops a row that reappears on a later page, keeping the first copy", () => {
    const merged = mergeKeysetPages([{ items: [item("a"), item("b")], total: 3, nextCursor: "next" }, { items: [item("b"), item("c")], total: null, nextCursor: null }]);

    expect(merged.items.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("copes with no pages", () => {
    expect(mergeKeysetPages([])).toEqual({ items: [], total: 0 });
  });
});
