import { z } from "zod";

/** Rolling windows, each compared with the equally long window before it. */
export const periodRangeValues = ["7d", "30d", "90d", "180d", "365d"] as const;
export type PeriodRange = (typeof periodRangeValues)[number];

/** The overview's calendar covers 26 weeks, so its comparison (two windows) cannot reach past 90 days. */
export const overviewRangeValues = ["7d", "30d", "90d"] as const satisfies readonly PeriodRange[];
export type OverviewRange = (typeof overviewRangeValues)[number];

export const overviewQuerySchema = z.strictObject({ range: z.enum(overviewRangeValues).default("30d") });
export type OverviewQuery = z.infer<typeof overviewQuerySchema>;

export const insightsQuerySchema = z.strictObject({ range: z.enum(periodRangeValues).default("90d") });
export type InsightsQuery = z.infer<typeof insightsQuerySchema>;

/** What results can be split by. Each maps to a fixed expression in the repository; nothing here ever reaches SQL as text. */
export const performanceDimensionValues = ["route", "module", "persona", "country", "organizationType", "channel", "campaign", "source"] as const;
export type PerformanceDimension = (typeof performanceDimensionValues)[number];

const maxBreakdownRows = 50;
export const defaultBreakdownRows = 25;

export const breakdownQuerySchema = z.strictObject({
  range: z.enum(periodRangeValues).default("90d"),
  by: z.enum(performanceDimensionValues).default("route"),
  limit: z.coerce.number().int().min(1).max(maxBreakdownRows).default(defaultBreakdownRows)
});
export type BreakdownQuery = z.infer<typeof breakdownQuerySchema>;
