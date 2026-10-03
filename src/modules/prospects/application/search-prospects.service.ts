import { toProspectSummary } from "@/modules/prospects/application/prospect-views";
import type { ProspectRepository } from "@/modules/prospects/data/prospect.repository";
import { prospectPagination, type ProspectSearchQuery } from "@/modules/prospects/domain/prospect.schema";
import type { ProspectPage } from "@/modules/prospects/domain/prospect.types";
import { sliceKeysetPage } from "@/shared/api/keyset";

type SearchProspectsRepository = Pick<ProspectRepository, "searchProspects" | "countProspects">;

export async function searchProspects(repository: SearchProspectsRepository, query: ProspectSearchQuery): Promise<ProspectPage> {
  const { cursor: encodedCursor, limit, sort, ...filters } = query;
  const cursor = prospectPagination.requireCursor(encodedCursor);

  // The total never changes while paging through one filter set, so only the first page pays for counting.
  const [fetchedRows, total] = await Promise.all([
    repository.searchProspects({ ...filters, sort, limit, ...(cursor ? { cursor } : {}) }),
    cursor ? null : repository.countProspects(filters)
  ]);

  const { rows, nextCursor } = sliceKeysetPage(fetchedRows, limit, (lastRow) => prospectPagination.encode({ sort, key: lastRow.sortKey, id: lastRow.id }));
  return { items: rows.map(toProspectSummary), total, nextCursor };
}
