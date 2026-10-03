"use client";

import { keepPreviousData, skipToken, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { defaultLibraryFilters, documentPageSize, type LibraryFilters } from "@/modules/library/domain/document.schema";
import { shouldRetryRequest } from "@/shared/api/api-request-error";
import { fetchDocument, fetchDocumentPage, fetchLibraryFacets } from "@/modules/library/ui/library-api";

const recentDocumentCount = 6;

export const libraryKeys = {
  all: ["library"] as const,
  facets: () => [...libraryKeys.all, "facets"] as const,
  recent: () => [...libraryKeys.all, "recent"] as const,
  list: (filters: LibraryFilters) => [...libraryKeys.all, "list", filters] as const,
  detail: (id: string) => [...libraryKeys.all, "detail", id] as const
};

// The first page has no cursor; every later page continues from the previous page's `nextCursor`.
const firstPage: string | null = null;

export function useDocumentPages(filters: LibraryFilters) {
  return useInfiniteQuery({
    queryKey: libraryKeys.list(filters),
    queryFn: ({ pageParam }) => fetchDocumentPage({ filters, limit: documentPageSize.default, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: firstPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
    retry: shouldRetryRequest
  });
}

export function useRecentDocuments() {
  return useQuery({
    queryKey: libraryKeys.recent(),
    queryFn: () => fetchDocumentPage({ filters: defaultLibraryFilters, limit: recentDocumentCount }),
    retry: shouldRetryRequest
  });
}

export function useDocumentDetail(id: string | null) {
  return useQuery({
    queryKey: libraryKeys.detail(id ?? ""),
    queryFn: id === null ? skipToken : () => fetchDocument(id),
    retry: shouldRetryRequest
  });
}

export function useLibraryFacets() {
  return useQuery({ queryKey: libraryKeys.facets(), queryFn: fetchLibraryFacets, staleTime: 60_000, retry: shouldRetryRequest });
}
