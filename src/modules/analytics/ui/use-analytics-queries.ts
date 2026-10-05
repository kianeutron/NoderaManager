"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { InsightsQuery, OverviewRange, PerformanceDimension, PeriodRange } from "@/modules/analytics/domain/analytics.schema";
import { analyticsKeys } from "@/modules/analytics/ui/analytics-keys";
import { fetchBreakdown, fetchInsights, fetchOverview } from "@/modules/analytics/ui/analytics-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";

// Cached for 30 s (the client default), which is safe because every successful write marks these queries stale, so a figure
// never lags what was just logged. The previous window stays on screen while the next one loads.
const live = { retry: shouldRetryRequest, placeholderData: keepPreviousData } as const;

export function useOverview(range: OverviewRange) {
  return useQuery({ queryKey: analyticsKeys.overview(range), queryFn: () => fetchOverview(range), ...live });
}

export function useInsights(range: InsightsQuery["range"]) {
  return useQuery({ queryKey: analyticsKeys.insights(range), queryFn: () => fetchInsights(range), ...live });
}

export function useBreakdown(range: PeriodRange, by: PerformanceDimension) {
  return useQuery({ queryKey: analyticsKeys.breakdown(range, by), queryFn: () => fetchBreakdown(range, by), ...live });
}
