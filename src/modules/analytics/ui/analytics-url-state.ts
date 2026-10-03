import { z } from "zod";
import { performanceDimensionValues, periodRangeValues, type PerformanceDimension, type PeriodRange } from "@/modules/analytics/domain/analytics.schema";
import type { UrlStateCodec } from "@/shared/ui/use-url-query-state";

export type AnalyticsState = Readonly<{ range: PeriodRange; by: PerformanceDimension }>;

const defaultAnalyticsState: AnalyticsState = { range: "90d", by: "route" };

// Each parameter falls back on its own, so one hand-edited value never resets the other.
const paramsSchema = z.object({
  range: z.enum(periodRangeValues).catch(defaultAnalyticsState.range),
  by: z.enum(performanceDimensionValues).catch(defaultAnalyticsState.by)
});

/** The window and what results are split by, in one shareable URL. Defaults are omitted so the canonical URL stays clean. */
export const analyticsUrlCodec: UrlStateCodec<AnalyticsState> = {
  parse: (params) => paramsSchema.parse(Object.fromEntries(params)),
  serialize: ({ range, by }) => {
    const params = new URLSearchParams();
    if (range !== defaultAnalyticsState.range) params.set("range", range);
    if (by !== defaultAnalyticsState.by) params.set("by", by);
    return params.toString();
  }
};
