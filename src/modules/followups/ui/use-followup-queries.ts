"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { followUpPagination } from "@/modules/followups/domain/followup.schema";
import { fetchFollowUp, fetchFollowUpPage, fetchFollowUpSummary, type FollowUpListFilters } from "@/modules/followups/ui/followups-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";
import { useKeysetList } from "@/shared/ui/use-keyset-list";

export const followUpKeys = {
  all: ["followups"] as const,
  list: (filters: FollowUpListFilters) => [...followUpKeys.all, "list", filters] as const,
  detail: (id: string) => [...followUpKeys.all, "detail", id] as const,
  summary: () => [...followUpKeys.all, "summary"] as const
};

export function useFollowUpList(filters: FollowUpListFilters) {
  return useKeysetList({ queryKey: followUpKeys.list(filters), fetchPage: (cursor) => fetchFollowUpPage(filters, followUpPagination.pageSize.default, cursor) });
}

export function useFollowUp(id: string | null) {
  return useQuery({ queryKey: followUpKeys.detail(id ?? ""), queryFn: id === null ? skipToken : () => fetchFollowUp(id), retry: shouldRetryRequest });
}

export function useFollowUpSummary() {
  return useQuery({ queryKey: followUpKeys.summary(), queryFn: fetchFollowUpSummary, retry: shouldRetryRequest });
}
