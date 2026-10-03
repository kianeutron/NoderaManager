"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { InsightsQuery, OverviewRange, PerformanceDimension, PeriodRange } from "@/modules/analytics/domain/analytics.schema";
import { fetchBreakdown, fetchInsights, fetchOverview } from "@/modules/analytics/ui/analytics-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";

export const analyticsKeys = {
  all: ["analytics"] as const,
  overview: (range: OverviewRange) => [...analyticsKeys.all, "overview", range] as const,
  insights: (range: PeriodRange) => [...analyticsKeys.all, "insights", range] as const,
  breakdown: (range: PeriodRange, by: PerformanceDimension) => [...analyticsKeys.all, "breakdown", range, by] as const
};

// Figures are always re-read when a page is opened or the window regains focus, so they never lag what was just logged.
// The previous window stays on screen while the next one loads.
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
