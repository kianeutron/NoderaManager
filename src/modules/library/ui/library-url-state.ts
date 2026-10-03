import { z } from "zod";
import { defaultLibraryFilters, libraryFiltersSchema, type LibraryFilters } from "@/modules/library/domain/document.schema";

export type LibraryUrlState = Readonly<{ filters: LibraryFilters; documentId: string | null }>;

const documentIdSchema = z.uuid();

/** Invalid or hand-edited URLs fall back to the default view instead of breaking the page. */
export function parseLibraryUrlState(params: URLSearchParams): LibraryUrlState {
  const filters = libraryFiltersSchema.safeParse(Object.fromEntries(params));
  const documentId = documentIdSchema.safeParse(params.get("doc"));

  return { filters: filters.success ? filters.data : defaultLibraryFilters, documentId: documentId.success ? documentId.data : null };
}

/** Defaults are omitted so the canonical library URL stays clean and shareable. */
export function serializeLibraryUrlState({ filters, documentId }: LibraryUrlState): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.tagId) params.set("tagId", filters.tagId);
  if (filters.folderId) params.set("folderId", filters.folderId);
  if (filters.sort !== defaultLibraryFilters.sort) params.set("sort", filters.sort);
  if (documentId) params.set("doc", documentId);
  return params.toString();
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return Boolean(filters.q || filters.category || filters.tagId || filters.folderId);
}
