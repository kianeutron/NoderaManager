import { describe, expect, it } from "vitest";
import { mergeDocumentPages } from "@/modules/library/ui/document-pages";
import { createDocumentSummary } from "@/test/factories/library-documents";

const documentWith = (id: string) => createDocumentSummary({ id, title: id });

describe("mergeDocumentPages", () => {
  it("concatenates pages in order and takes the total from the first page", () => {
    const merged = mergeDocumentPages([
      { items: [documentWith("a"), documentWith("b")], total: 3, nextCursor: "next" },
      { items: [documentWith("c")], total: null, nextCursor: null }
    ]);

    expect(merged.documents.map((document) => document.id)).toEqual(["a", "b", "c"]);
    expect(merged.total).toBe(3);
  });

  it("drops a document that reappears on a later page, keeping the first copy", () => {
    const merged = mergeDocumentPages([
      { items: [documentWith("a"), documentWith("b")], total: 3, nextCursor: "next" },
      { items: [documentWith("b"), documentWith("c")], total: null, nextCursor: null }
    ]);

    expect(merged.documents.map((document) => document.id)).toEqual(["a", "b", "c"]);
  });

  it("copes with no pages", () => {
    expect(mergeDocumentPages([])).toEqual({ documents: [], total: 0 });
  });
});
