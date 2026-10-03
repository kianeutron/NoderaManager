"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRouteCatalog, fetchRouteOverview } from "@/modules/routes/ui/routes-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";
import type { RecordScope } from "@/shared/api/field-schemas";

export const routeKeys = {
  all: ["routes"] as const,
  catalog: () => [...routeKeys.all, "catalog"] as const,
  overview: (scope: RecordScope) => [...routeKeys.all, "overview", scope] as const
};

/** Routes and their modules change rarely, so pickers reuse one copy for a minute. */
export function useRouteCatalog() {
  return useQuery({ queryKey: routeKeys.catalog(), queryFn: fetchRouteCatalog, staleTime: 60_000, retry: shouldRetryRequest });
}

/** Every route with what it has produced, for the routes page. */
export function useRouteOverview(scope: RecordScope) {
  return useQuery({ queryKey: routeKeys.overview(scope), queryFn: () => fetchRouteOverview(scope), retry: shouldRetryRequest });
}
