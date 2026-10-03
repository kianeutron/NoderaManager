import { toPersonSummary } from "@/modules/people/application/person-views";
import type { PersonRepository } from "@/modules/people/data/person.repository";
import { personPagination, type PersonSearchQuery } from "@/modules/people/domain/person.schema";
import type { PersonPage } from "@/modules/people/domain/person.types";
import { sliceKeysetPage } from "@/shared/api/keyset";

type SearchPeopleRepository = Pick<PersonRepository, "searchPeople" | "countPeople">;

export async function searchPeople(repository: SearchPeopleRepository, query: PersonSearchQuery): Promise<PersonPage> {
  const { cursor: encodedCursor, limit, sort, ...filters } = query;
  const cursor = personPagination.requireCursor(encodedCursor);

  // The total never changes while paging through one filter set, so only the first page pays for counting.
  const [fetchedRows, total] = await Promise.all([
    repository.searchPeople({ ...filters, sort, limit, ...(cursor ? { cursor } : {}) }),
    cursor ? null : repository.countPeople(filters)
  ]);

  const { rows, nextCursor } = sliceKeysetPage(fetchedRows, limit, (lastRow) => personPagination.encode({ sort, key: lastRow.sortKey, id: lastRow.id }));
  return { items: rows.map(toPersonSummary), total, nextCursor };
}
