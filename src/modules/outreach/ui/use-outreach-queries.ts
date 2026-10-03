"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { outreachPagination } from "@/modules/outreach/domain/outreach.schema";
import { fetchOutreachMessage, fetchOutreachPage, fetchOutreachSummary, fetchOutreachTargets, type OutreachListFilters } from "@/modules/outreach/ui/outreach-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";
import { useKeysetList } from "@/shared/ui/use-keyset-list";

export const outreachKeys = {
  all: ["outreach"] as const,
  list: (filters: OutreachListFilters) => [...outreachKeys.all, "list", filters] as const,
  detail: (id: string) => [...outreachKeys.all, "detail", id] as const,
  summary: () => [...outreachKeys.all, "summary"] as const,
  targets: (q: string | undefined) => [...outreachKeys.all, "targets", q ?? ""] as const
};

export function useOutreachList(filters: OutreachListFilters) {
  return useKeysetList({ queryKey: outreachKeys.list(filters), fetchPage: (cursor) => fetchOutreachPage(filters, outreachPagination.pageSize.default, cursor) });
}

export function useOutreachMessage(id: string | null) {
  return useQuery({ queryKey: outreachKeys.detail(id ?? ""), queryFn: id === null ? skipToken : () => fetchOutreachMessage(id), retry: shouldRetryRequest });
}

export function useOutreachSummary() {
  return useQuery({ queryKey: outreachKeys.summary(), queryFn: fetchOutreachSummary, retry: shouldRetryRequest });
}

/** Prospects a message can be logged against, narrowed as the owner types. */
export function useOutreachTargets(q: string | undefined) {
  return useQuery({ queryKey: outreachKeys.targets(q), queryFn: () => fetchOutreachTargets(q), retry: shouldRetryRequest });
}
