import { hc } from "hono/client";
import type { AnalyticsRoutes } from "@/modules/analytics/api/analytics.routes";
import { defaultBreakdownRows, type OverviewRange, type PerformanceDimension, type PeriodRange } from "@/modules/analytics/domain/analytics.schema";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const analyticsClient = () => hc<AnalyticsRoutes>(`${window.location.origin}/api/analytics`);

export async function fetchOverview(range: OverviewRange) {
  const response = await analyticsClient().overview.$get({ query: { range } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchInsights(range: PeriodRange) {
  const response = await analyticsClient().insights.$get({ query: { range } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchBreakdown(range: PeriodRange, by: PerformanceDimension) {
  const response = await analyticsClient().breakdown.$get({ query: { range, by, limit: String(defaultBreakdownRows) } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}
