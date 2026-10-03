import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import { organizationPagination, type OrganizationSearchQuery } from "@/modules/organizations/domain/organization.schema";
import type { OrganizationPage } from "@/modules/organizations/domain/organization.types";
import { sliceKeysetPage } from "@/shared/api/keyset";

type SearchOrganizationsRepository = Pick<OrganizationRepository, "searchOrganizations" | "countOrganizations">;

export async function searchOrganizations(repository: SearchOrganizationsRepository, query: OrganizationSearchQuery): Promise<OrganizationPage> {
  const { cursor: encodedCursor, limit, sort, ...filters } = query;
  const cursor = organizationPagination.requireCursor(encodedCursor);

  // The total never changes while paging through one filter set, so only the first page pays for counting.
  const [fetchedRows, total] = await Promise.all([
    repository.searchOrganizations({ ...filters, sort, limit, ...(cursor ? { cursor } : {}) }),
    cursor ? null : repository.countOrganizations(filters)
  ]);

  const { rows, nextCursor } = sliceKeysetPage(fetchedRows, limit, (lastRow) => organizationPagination.encode({ sort, key: lastRow.sortKey, id: lastRow.id }));
  return { items: rows.map(({ sortKey: _sortKey, updatedAt, ...row }) => ({ ...row, updatedAt: updatedAt.toISOString() })), total, nextCursor };
}
