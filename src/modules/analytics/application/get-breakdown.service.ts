import type { PerformanceRepository } from "@/modules/analytics/data/performance.repository";
import type { BreakdownQuery } from "@/modules/analytics/domain/analytics.schema";
import type { PerformanceBreakdown } from "@/modules/analytics/domain/analytics.types";
import { periodWindow, utcDay } from "@/modules/analytics/domain/period-window";
import { toPerformanceRows } from "@/modules/analytics/application/insights-builders";

/** Messages in the window split by route, persona, country or another dimension, biggest group first. */
export async function getBreakdown(performance: Pick<PerformanceRepository, "breakdown">, { range, by, limit }: BreakdownQuery, now = new Date()): Promise<PerformanceBreakdown> {
  const window = periodWindow(range, now);
  const { rows, groups } = toPerformanceRows(await performance.breakdown({ dimension: by, from: window.from, limit }));
  return { range, days: window.days, from: utcDay(window.from), to: utcDay(now), dimension: by, rows, groups };
}
