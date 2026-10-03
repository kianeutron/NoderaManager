import { describe, expect, it } from "vitest";
import { defaultLibraryFilters } from "@/modules/library/domain/document.schema";
import { hasActiveFilters, parseLibraryUrlState, serializeLibraryUrlState } from "@/modules/library/ui/library-url-state";

const documentId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("library URL state", () => {
  it("round-trips filters and the selected document", () => {
    const state = { filters: { ...defaultLibraryFilters, q: "pitch deck", category: "proposal" as const, sort: "title" as const }, documentId };
    const query = serializeLibraryUrlState(state);

    expect(parseLibraryUrlState(new URLSearchParams(query))).toEqual(state);
  });

  it("keeps the canonical URL clean by omitting defaults", () => {
    expect(serializeLibraryUrlState({ filters: defaultLibraryFilters, documentId: null })).toBe("");
  });

  it("falls back to the default view for invalid values instead of throwing", () => {
    const state = parseLibraryUrlState(new URLSearchParams({ category: "invoice", doc: "nope" }));

    expect(state).toEqual({ filters: defaultLibraryFilters, documentId: null });
  });

  it("keeps a valid document selection even when a filter is invalid", () => {
    expect(parseLibraryUrlState(new URLSearchParams({ category: "invoice", doc: documentId })).documentId).toBe(documentId);
  });

  it("tells filters that narrow the list apart from sorting", () => {
    expect(hasActiveFilters(defaultLibraryFilters)).toBe(false);
    expect(hasActiveFilters({ ...defaultLibraryFilters, sort: "title" })).toBe(false);
    expect(hasActiveFilters({ ...defaultLibraryFilters, q: "x" })).toBe(true);
  });
});
