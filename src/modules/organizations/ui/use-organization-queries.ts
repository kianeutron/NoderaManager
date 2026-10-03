"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { organizationPagination } from "@/modules/organizations/domain/organization.schema";
import { fetchOrganization, fetchOrganizationsPage, type OrganizationFilters } from "@/modules/organizations/ui/organizations-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";
import { useKeysetList } from "@/shared/ui/use-keyset-list";

export const organizationKeys = {
  all: ["organizations"] as const,
  list: (filters: OrganizationFilters) => [...organizationKeys.all, "list", filters] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const
};

export function useOrganizationList(filters: OrganizationFilters) {
  return useKeysetList({ queryKey: organizationKeys.list(filters), fetchPage: (cursor) => fetchOrganizationsPage(filters, organizationPagination.pageSize.default, cursor) });
}

export function useOrganization(id: string | null) {
  return useQuery({ queryKey: organizationKeys.detail(id ?? ""), queryFn: id === null ? skipToken : () => fetchOrganization(id), retry: shouldRetryRequest });
}
