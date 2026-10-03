import { funnelSteps, responseTimeBuckets } from "@/modules/analytics/domain/analytics-values";
import type { Deliverability, FunnelStep, PerformanceRow, Rate, ResponseTime } from "@/modules/analytics/domain/analytics.types";

type FunnelCounts = Readonly<Record<(typeof funnelSteps)[number], number>> & Readonly<{ won: number }>;

export function toFunnel({ won, ...counts }: FunnelCounts): Readonly<{ steps: FunnelStep[]; won: number }> {
  return { steps: funnelSteps.map((step) => ({ step, prospects: counts[step] })), won };
}

type ResponseTimeRow = Readonly<{ sample: number; medianHours: number | null; withinHour: number; withinDay: number; withinThreeDays: number; withinWeek: number }>;

/** The database counts replies faster than each limit (running totals); the chart wants how many fell in each band. */
export function toResponseTime({ sample, medianHours, withinHour, withinDay, withinThreeDays, withinWeek }: ResponseTimeRow): ResponseTime {
  const running = [withinHour, withinDay, withinThreeDays, withinWeek, sample];
  const buckets = responseTimeBuckets.map((bucket, index) => ({ bucket, replies: running[index]! - (running[index - 1] ?? 0) }));
  return { sample, medianHours, buckets };
}

type DeliverabilityRow = Readonly<{ sent: number; delivered: number; failed: number; soft: number; hard: number; blocked: number }>;

export function toDeliverability({ sent, delivered, failed, soft, hard, blocked }: DeliverabilityRow): Deliverability {
  return { sent, delivered, failed, unconfirmed: sent - delivered - failed, bounces: { soft, hard, blocked } };
}

type Totals = Readonly<{ replied: number; reached: number; emailBounced: number; emailSent: number }>;
type Windows = Readonly<{ current: Totals; previous: Totals }>;

export const toReplyRate = ({ current, previous }: Windows): Rate => ({ current: { part: current.replied, whole: current.reached }, previous: { part: previous.replied, whole: previous.reached } });
/** Bounces over emails sent: only email can bounce, so other channels stay out of the denominator (docs/11-operations/02-analytics-definitions.md). */
export const toBounceRate = ({ current, previous }: Windows): Rate => ({ current: { part: current.emailBounced, whole: current.emailSent }, previous: { part: previous.emailBounced, whole: previous.emailSent } });

type BreakdownRow = PerformanceRow & Readonly<{ groups: number }>;

/** Separates the group count the database repeats on every row from the rows themselves. */
export function toPerformanceRows(rows: readonly BreakdownRow[]): Readonly<{ rows: PerformanceRow[]; groups: number }> {
  return { rows: rows.map(({ groups: _groups, ...row }) => row), groups: rows[0]?.groups ?? 0 };
}
