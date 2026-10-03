import type { FollowUpRepository } from "@/modules/followups/data/followup.repository";
import { followUpPagination, type FollowUpSearchQuery } from "@/modules/followups/domain/followup.schema";
import type { FollowUpPage } from "@/modules/followups/domain/followup.types";
import { toFollowUpView } from "@/modules/followups/application/followup-views";
import { sliceKeysetPage } from "@/shared/api/keyset";

type SearchFollowUpsRepository = Pick<FollowUpRepository, "searchFollowUps" | "countFollowUps">;

export async function searchFollowUps(repository: SearchFollowUpsRepository, query: FollowUpSearchQuery): Promise<FollowUpPage> {
  const { cursor: encodedCursor, limit, sort, ...filters } = query;
  const cursor = followUpPagination.requireCursor(encodedCursor);

  // The total never changes while paging through one filter set, so only the first page pays for counting.
  const [fetchedRows, total] = await Promise.all([
    repository.searchFollowUps({ ...filters, sort, limit, ...(cursor ? { cursor } : {}) }),
    cursor ? null : repository.countFollowUps(filters)
  ]);

  const { rows, nextCursor } = sliceKeysetPage(fetchedRows, limit, (lastRow) => followUpPagination.encode({ sort, key: lastRow.sortKey, id: lastRow.id }));
  return { items: rows.map(toFollowUpView), total, nextCursor };
}
