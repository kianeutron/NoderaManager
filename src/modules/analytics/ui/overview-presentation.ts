import type { PeriodRange } from "@/modules/analytics/domain/analytics.schema";
import type { Overview } from "@/modules/analytics/domain/analytics.types";

const dayMs = 86_400_000;

/** Below this many prospects or messages a rate says little, so the page says so (docs/11-operations/02-analytics-definitions.md). */
export const smallSample = 10;
const dayFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });
const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });

export const rangeLabel = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "180d": "6 months", "365d": "12 months" } as const satisfies Record<PeriodRange, string>;

export function greetingFor(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const counted = (count: number, singular: string, plural = `${singular}s`) => `${count.toLocaleString("en")} ${count === 1 ? singular : plural}`;

/** "Sep 30" for a UTC day (`YYYY-MM-DD`). Days are UTC everywhere in the overview, so a day never shifts with the viewer's timezone. */
export const formatDay = (date: string): string => dayFormatter.format(new Date(`${date}T00:00:00Z`));
export const formatWeekday = (date: string): string => weekdayFormatter.format(new Date(`${date}T00:00:00Z`));

/** Whole days since a moment, for "sent 5 days ago". */
export const daysSince = (isoTimestamp: string, now: Date): number => Math.max(0, Math.floor((now.getTime() - new Date(isoTimestamp).getTime()) / dayMs));
export const describeAge = (days: number): string => (days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`);

/** One sentence on what needs doing today, most urgent first; calm when nothing does. */
export function briefingOf({ followUps, awaitingReply, totals, days }: Pick<Overview, "followUps" | "awaitingReply" | "totals" | "days">): string {
  const needs = [
    followUps.summary.overdue > 0 ? `${counted(followUps.summary.overdue, "follow-up")} overdue` : null,
    awaitingReply.total > 0 ? `${counted(awaitingReply.total, "message")} waiting on a reply` : null
  ].filter((part): part is string => part !== null);

  if (needs.length > 0) return `${needs.join(" and ")}.`;
  if (totals.sent.current === 0) return `Nothing sent in the last ${days} days. Log a message to start the picture.`;
  return `Nothing is overdue. ${counted(totals.sent.current, "message")} sent in the last ${days} days.`;
}

/** Name to show for a prospect's person and company, whichever exist. */
export const recipientName = (person: string | null, organization: string | null): string => person ?? organization ?? "Unknown recipient";
