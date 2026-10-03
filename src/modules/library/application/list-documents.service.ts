import { toDocumentSummary } from "@/modules/library/application/document-views";
import type { DocumentRepository } from "@/modules/library/data/document.repository";
import { documentPagination, type DocumentListQuery } from "@/modules/library/domain/document.schema";
import type { DocumentPage } from "@/modules/library/domain/document.types";
import { sliceKeysetPage } from "@/shared/api/keyset";

type ListDocumentsRepository = Pick<DocumentRepository, "listDocuments" | "countDocuments" | "listTagNames">;

export async function listDocuments(repository: ListDocumentsRepository, query: DocumentListQuery): Promise<DocumentPage> {
  const { cursor: encodedCursor, ...criteria } = query;
  const cursor = documentPagination.requireCursor(encodedCursor);

  // The total never changes while paging through one filter set, so only the first page pays for counting.
  const [fetchedRows, total] = await Promise.all([
    repository.listDocuments({ ...criteria, ...(cursor ? { cursor } : {}) }),
    cursor ? null : repository.countDocuments(criteria)
  ]);

  const { rows, nextCursor } = sliceKeysetPage(fetchedRows, query.limit, (lastRow) => documentPagination.encode({ sort: query.sort, key: lastRow.sortKey, id: lastRow.id }));
  const tagNames = await repository.listTagNames(rows.map((row) => row.id));
  return { items: rows.map((row) => toDocumentSummary(row, tagNames.get(row.id) ?? [])), total, nextCursor };
}
