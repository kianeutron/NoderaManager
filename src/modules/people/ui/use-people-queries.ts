"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { personPagination } from "@/modules/people/domain/person.schema";
import { fetchPeoplePage, fetchPerson, type PeopleFilters } from "@/modules/people/ui/people-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";
import { useKeysetList } from "@/shared/ui/use-keyset-list";

export const peopleKeys = {
  all: ["people"] as const,
  list: (filters: PeopleFilters) => [...peopleKeys.all, "list", filters] as const,
  detail: (id: string) => [...peopleKeys.all, "detail", id] as const
};

export function usePeopleList(filters: PeopleFilters) {
  return useKeysetList({ queryKey: peopleKeys.list(filters), fetchPage: (cursor) => fetchPeoplePage(filters, personPagination.pageSize.default, cursor) });
}

export function usePerson(id: string | null) {
  return useQuery({ queryKey: peopleKeys.detail(id ?? ""), queryFn: id === null ? skipToken : () => fetchPerson(id), retry: shouldRetryRequest });
}
