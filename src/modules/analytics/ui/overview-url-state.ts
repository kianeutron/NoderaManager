import { z } from "zod";
import { overviewRangeValues, type OverviewRange } from "@/modules/analytics/domain/analytics.schema";
import type { UrlStateCodec } from "@/shared/ui/use-url-query-state";

const defaultOverviewRange: OverviewRange = "30d";

const paramsSchema = z.object({ range: z.enum(overviewRangeValues).catch(defaultOverviewRange) });

/** The window is the only state: `?range=7d`. The default is omitted so the canonical URL stays clean. */
export const overviewUrlCodec: UrlStateCodec<OverviewRange> = {
  parse: (params) => paramsSchema.parse(Object.fromEntries(params)).range,
  serialize: (range) => (range === defaultOverviewRange ? "" : new URLSearchParams({ range }).toString())
};
