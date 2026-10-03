"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { defaultLibraryFilters, type LibraryFilters } from "@/modules/library/domain/document.schema";
import { parseLibraryUrlState, serializeLibraryUrlState, type LibraryUrlState } from "@/modules/library/ui/library-url-state";

export type NavigationMode = "push" | "replace";

/** The URL is the single source of truth for filters and the selected document. */
export function useLibraryUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseLibraryUrlState(searchParams), [searchParams]);

  const navigate = useCallback((next: LibraryUrlState, mode: NavigationMode) => {
    const query = serializeLibraryUrlState(next);
    router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router]);

  const setFilters = useCallback((patch: Partial<LibraryFilters>, mode: NavigationMode = "push") => {
    navigate({ ...state, filters: { ...state.filters, ...patch } }, mode);
  }, [navigate, state]);

  const selectDocument = useCallback((documentId: string | null) => navigate({ ...state, documentId }, "push"), [navigate, state]);
  const clearFilters = useCallback(() => navigate({ ...state, filters: defaultLibraryFilters }, "push"), [navigate, state]);

  return { ...state, setFilters, selectDocument, clearFilters };
}
