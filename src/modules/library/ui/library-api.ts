import { hc } from "hono/client";
import type { LibraryRoutes } from "@/modules/library/api/library.routes";
import type { LibraryFilters } from "@/modules/library/domain/document.schema";
import { toApiRequestError } from "@/shared/api/api-request-error";
import type { ContentDisposition } from "@/modules/library/domain/file-delivery";

// Created on demand: the absolute base URL only exists in the browser.
const libraryClient = () => hc<LibraryRoutes>(`${window.location.origin}/api/library`);

export type DocumentPageRequest = Readonly<{ filters: LibraryFilters; limit: number; cursor?: string }>;

export async function fetchDocumentPage({ filters, limit, cursor }: DocumentPageRequest) {
  const { q, category, tagId, folderId, sort } = filters;
  const response = await libraryClient().documents.$get({
    query: { limit: String(limit), sort, ...(q ? { q } : {}), ...(category ? { category } : {}), ...(tagId ? { tagId } : {}), ...(folderId ? { folderId } : {}), ...(cursor ? { cursor } : {}) }
  });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchDocument(id: string) {
  const response = await libraryClient().documents[":id"].$get({ param: { id } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchLibraryFacets() {
  const response = await libraryClient().facets.$get();
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export type UploadDocumentInput = Readonly<{
  file: File;
  title: string;
  description?: string | undefined;
  category: string;
  folderId?: string | undefined;
  tags: string[];
}>;

export async function uploadDocument(input: UploadDocumentInput) {
  const form = new FormData();
  form.set("file", input.file);
  form.set("title", input.title);
  form.set("category", input.category);
  form.set("tags", JSON.stringify(input.tags));
  if (input.description) form.set("description", input.description);
  if (input.folderId) form.set("folderId", input.folderId);

  const response = await fetch(`${window.location.origin}/api/library/documents/upload`, { method: "POST", body: form, credentials: "same-origin" });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

/** Same-origin path to the authorized file endpoint for a document's current version. */
export function documentFilePath(id: string, disposition: ContentDisposition): string {
  const url = libraryClient().documents[":id"].file.$url({ param: { id }, query: { disposition } });
  return `${url.pathname}${url.search}`;
}
