import type { OverviewRange } from "@/modules/analytics/domain/analytics.schema";
import { periodWindow, type PeriodWindow } from "@/modules/analytics/domain/period-window";

const dayMs = 86_400_000;
/** The calendar covers 26 weeks; no window may reach back further than it can show. */
export const calendarDays = 182;
export const awaitingReplyAfterDays = 3;
export const awaitingReplyWithinDays = 30;

export type OverviewWindow = PeriodWindow & Readonly<{ calendarFrom: Date }>;

export function overviewWindow(range: OverviewRange, now: Date): OverviewWindow {
  const window = periodWindow(range, now);
  return { ...window, calendarFrom: new Date(window.from.getTime() - (calendarDays - window.days) * dayMs) };
}
