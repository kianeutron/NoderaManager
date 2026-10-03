"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { campaignPagination, memberPagination } from "@/modules/campaigns/domain/campaign.schema";
import { fetchCampaign, fetchCampaignMembersPage, fetchCampaignPage, fetchCampaignSuggestions, fetchProspectCampaigns, type CampaignListFilters } from "@/modules/campaigns/ui/campaigns-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";
import { useKeysetList } from "@/shared/ui/use-keyset-list";

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: (filters: CampaignListFilters) => [...campaignKeys.all, "list", filters] as const,
  detail: (id: string) => [...campaignKeys.all, "detail", id] as const,
  members: (id: string) => [...campaignKeys.all, "members", id] as const,
  suggestions: (id: string, q: string | undefined) => [...campaignKeys.all, "suggestions", id, q ?? ""] as const,
  forProspect: (prospectId: string) => [...campaignKeys.all, "prospect", prospectId] as const
};

export function useCampaignList(filters: CampaignListFilters) {
  return useKeysetList({ queryKey: campaignKeys.list(filters), fetchPage: (cursor) => fetchCampaignPage(filters, campaignPagination.pageSize.default, cursor) });
}

export function useCampaign(id: string | null) {
  return useQuery({ queryKey: campaignKeys.detail(id ?? ""), queryFn: id === null ? skipToken : () => fetchCampaign(id), retry: shouldRetryRequest });
}

export function useCampaignMembers(id: string) {
  return useKeysetList({ queryKey: campaignKeys.members(id), fetchPage: (cursor) => fetchCampaignMembersPage(id, memberPagination.pageSize.default, cursor) });
}

/** Prospects that could join, narrowed as the owner types. Read only when the picker is open. */
export function useCampaignSuggestions(id: string, q: string | undefined) {
  return useQuery({ queryKey: campaignKeys.suggestions(id, q), queryFn: () => fetchCampaignSuggestions(id, q), retry: shouldRetryRequest });
}

/** The active campaigns a prospect is in. Nothing is fetched until a prospect is chosen. */
export function useProspectCampaigns(prospectId: string | null) {
  return useQuery({ queryKey: campaignKeys.forProspect(prospectId ?? ""), queryFn: prospectId === null ? skipToken : () => fetchProspectCampaigns(prospectId), retry: shouldRetryRequest });
}
