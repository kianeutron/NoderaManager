import type { ActivityPoint } from "@/modules/analytics/domain/analytics.types";
import { heatLevel, type HeatLevel } from "@/shared/ui/charts/heat-scale";

export type CalendarCell = Readonly<{ date: string; sent: number; replies: number; level: HeatLevel }>;
type CalendarWeek = readonly (CalendarCell | null)[];
export type CalendarLayout = Readonly<{
  /** Columns of seven rows, Monday first. The first and last week may start or end with gaps. */
  weeks: readonly CalendarWeek[];
  /** The column each month's label sits above: the first column that starts in that month. */
  months: readonly Readonly<{ week: number; label: string }>[];
  activeDays: number;
  total: number;
  busiest: CalendarCell | null;
  /** Consecutive days with a message ending today, or yesterday if nothing was sent yet today. */
  streak: number;
}>;

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
const mondayFirst = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

export function layoutCalendar(days: readonly ActivityPoint[]): CalendarLayout {
  const peak = Math.max(0, ...days.map((day) => day.sent));
  const cells: CalendarCell[] = days.map((day) => ({ ...day, level: heatLevel(day.sent, peak) }));

  const first = cells[0];
  const padding = first ? mondayFirst(first.date) : 0;
  const slots: (CalendarCell | null)[] = [...Array<null>(padding).fill(null), ...cells];
  const weeks: CalendarWeek[] = [];
  for (let index = 0; index < slots.length; index += 7) weeks.push(slots.slice(index, index + 7));

  // A month is labelled above the first column that starts in it.
  const months: { week: number; label: string }[] = [];
  weeks.forEach((week, weekIndex) => {
    const firstDay = week.find((cell) => cell !== null)?.date;
    const label = firstDay ? monthFormatter.format(new Date(`${firstDay}T00:00:00Z`)) : undefined;
    if (label && months.at(-1)?.label !== label) months.push({ week: weekIndex, label });
  });

  let streak = 0;
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index];
    if (cell && cell.sent > 0) streak += 1;
    else if (index === cells.length - 1) continue;
    else break;
  }

  return {
    weeks, months, streak,
    activeDays: cells.filter((cell) => cell.sent > 0).length,
    total: cells.reduce((sum, cell) => sum + cell.sent, 0),
    busiest: cells.reduce<CalendarCell | null>((best, cell) => (cell.sent > (best?.sent ?? 0) ? cell : best), null)
  };
}
