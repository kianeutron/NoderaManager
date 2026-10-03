import { describe, expect, it } from "vitest";
import { documentFileQuerySchema, documentListQuerySchema, documentPagination, libraryFiltersSchema } from "@/modules/library/domain/document.schema";

const cursorId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("library filter schemas", () => {
  it("applies defaults for an empty query", () => {
    expect(documentListQuerySchema.parse({})).toEqual({ sort: "updated", limit: 24 });
  });

  it("coerces numeric query strings and trims the search term", () => {
    expect(documentListQuerySchema.parse({ q: "  deck ", limit: "10" })).toMatchObject({ q: "deck", limit: 10 });
  });

  it.each([
    { category: "invoice" },
    { tagId: "not-a-uuid" },
    { q: "" },
    { limit: "500" },
    { limit: "0" },
    { cursor: "garbage" },
    { cursor: "x".repeat(601) },
    { sort: "title", cursor: documentPagination.encode({ sort: "updated", key: "2026-09-20 10:00:00+00", id: cursorId }) },
    { sort: "size" }
  ])("rejects %o", (query) => {
    expect(documentListQuerySchema.safeParse(query).success).toBe(false);
  });

  it("accepts a cursor issued for the same sort order", () => {
    const cursor = documentPagination.encode({ sort: "title", key: "deck", id: cursorId });

    expect(documentListQuerySchema.parse({ sort: "title", cursor })).toMatchObject({ sort: "title", cursor });
  });

  it("does not paginate the shared filter schema", () => {
    expect(libraryFiltersSchema.parse({ limit: "5" })).toEqual({ sort: "updated" });
  });

  it("defaults file requests to inline and rejects unknown dispositions", () => {
    expect(documentFileQuerySchema.parse({})).toEqual({ disposition: "inline" });
    expect(documentFileQuerySchema.safeParse({ disposition: "exec" }).success).toBe(false);
  });
});
