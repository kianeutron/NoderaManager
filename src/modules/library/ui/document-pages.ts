import type { DocumentPage, DocumentSummary } from "@/modules/library/domain/document.types";

/**
 * Merges loaded pages into one list. Keyset paging never repeats a row within one sort order, but a
 * rename under the title sort can move an already-loaded document behind the cursor, so the first
 * occurrence wins and later duplicates are dropped.
 */
export function mergeDocumentPages(pages: readonly DocumentPage[]): Readonly<{ documents: readonly DocumentSummary[]; total: number }> {
  const seen = new Set<string>();
  const documents = pages.flatMap((page) => page.items).filter((document) => !seen.has(document.id) && seen.add(document.id));

  return { documents, total: pages[0]?.total ?? documents.length };
}
