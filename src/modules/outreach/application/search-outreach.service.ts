import type { OutreachRepository } from "@/modules/outreach/data/outreach.repository";
import { outreachPagination, type OutreachSearchQuery } from "@/modules/outreach/domain/outreach.schema";
import type { OutreachMessagePage } from "@/modules/outreach/domain/outreach.types";
import { toOutreachSummary } from "@/modules/outreach/application/outreach-views";
import { sliceKeysetPage } from "@/shared/api/keyset";

type SearchOutreachRepository = Pick<OutreachRepository, "searchMessages" | "countMessages">;

export async function searchOutreach(repository: SearchOutreachRepository, query: OutreachSearchQuery): Promise<OutreachMessagePage> {
  const { cursor: encodedCursor, limit, sort, ...filters } = query;
  const cursor = outreachPagination.requireCursor(encodedCursor);

  // The total never changes while paging through one filter set, so only the first page pays for counting.
  const [fetchedRows, total] = await Promise.all([
    repository.searchMessages({ ...filters, sort, limit, ...(cursor ? { cursor } : {}) }),
    cursor ? null : repository.countMessages(filters)
  ]);

  const { rows, nextCursor } = sliceKeysetPage(fetchedRows, limit, (lastRow) => outreachPagination.encode({ sort, key: lastRow.sortKey, id: lastRow.id }));
  return { items: rows.map(toOutreachSummary), total, nextCursor };
}
