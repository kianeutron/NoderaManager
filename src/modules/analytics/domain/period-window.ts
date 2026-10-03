import type { ActivityPoint } from "@/modules/analytics/domain/analytics.types";
import type { PeriodRange } from "@/modules/analytics/domain/analytics.schema";

const dayMs = 86_400_000;

export type Granularity = "day" | "week";

const rangeDays = { "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365 } as const satisfies Record<PeriodRange, number>;

/** Past three months a point per day is noise, so longer windows are shown per week. */
export const granularityFor = (days: number): Granularity => (days > 90 ? "week" : "day");

export const utcDay = (date: Date): string => date.toISOString().slice(0, 10);
const startOfUtcDay = (date: Date): Date => new Date(`${utcDay(date)}T00:00:00.000Z`);
/** The Monday of the UTC week, which is where the database starts its weeks. */
const startOfUtcWeek = (date: Date): Date => new Date(startOfUtcDay(date).getTime() - ((date.getUTCDay() + 6) % 7) * dayMs);

export type PeriodWindow = Readonly<{
  days: number;
  /** First instant of the window and of the window before it. Days are UTC, so a figure never depends on the viewer's timezone. */
  from: Date;
  previousFrom: Date;
}>;

export function periodWindow(range: PeriodRange, now: Date): PeriodWindow {
  const days = rangeDays[range];
  const today = startOfUtcDay(now).getTime();
  return { days, from: new Date(today - (days - 1) * dayMs), previousFrom: new Date(today - (2 * days - 1) * dayMs) };
}

/** One point per bucket from the one holding `from` through the one holding `now`; quiet buckets are zeros, so charts never skip a day or week. */
export function fillBuckets(rows: readonly ActivityPoint[], from: Date, now: Date, granularity: Granularity): ActivityPoint[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const step = granularity === "week" ? 7 * dayMs : dayMs;
  const first = granularity === "week" ? startOfUtcWeek(from) : startOfUtcDay(from);
  const points: ActivityPoint[] = [];
  for (let time = first.getTime(); time <= now.getTime(); time += step) {
    const date = utcDay(new Date(time));
    points.push(byDate.get(date) ?? { date, sent: 0, replies: 0 });
  }
  return points;
}

/** Merges the two per-bucket counts the database returns separately. */
export function mergeBuckets(sent: readonly Readonly<{ day: string; count: number }>[], replies: readonly Readonly<{ day: string; count: number }>[]): ActivityPoint[] {
  const byDate = new Map<string, { date: string; sent: number; replies: number }>();
  const entry = (date: string) => byDate.get(date) ?? byDate.set(date, { date, sent: 0, replies: 0 }).get(date)!;
  for (const { day, count } of sent) entry(day).sent = count;
  for (const { day, count } of replies) entry(day).replies = count;
  return [...byDate.values()];
}

export const sumOf = (points: readonly ActivityPoint[], key: "sent" | "replies") => points.reduce((total, point) => total + point[key], 0);
