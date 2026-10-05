import type { OverviewRange, PerformanceDimension, PeriodRange } from "@/modules/analytics/domain/analytics.schema";
import { liveFiguresKey } from "@/shared/api/live-figures";

// Plain module (not a client module) so the server can prefetch under exactly the keys the browser reads.
export const analyticsKeys = {
  all: liveFiguresKey,
  overview: (range: OverviewRange) => [...analyticsKeys.all, "overview", range] as const,
  insights: (range: PeriodRange) => [...analyticsKeys.all, "insights", range] as const,
  breakdown: (range: PeriodRange, by: PerformanceDimension) => [...analyticsKeys.all, "breakdown", range, by] as const
};
