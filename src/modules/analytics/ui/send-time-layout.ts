import type { SendTimeCell } from "@/modules/analytics/domain/analytics.types";
import { heatLevel, type HeatLevel } from "@/shared/ui/charts/heat-scale";
import { shareOf } from "@/shared/ui/charts/percent-change";

export const sendTimeMetrics = ["volume", "replyRate"] as const;
export type SendTimeMetric = (typeof sendTimeMetrics)[number];

/** A cell needs at least this many messages before its reply rate is shaded: one lucky reply is not a best time. */
export const minimumCellSample = 3;

export type SendTimeSlot = Readonly<{ weekday: number; hour: number; sent: number; replied: number; level: HeatLevel; /** Whether the cell has enough messages for its reply rate to mean anything. */ rated: boolean }>;
export type SendTimeLayout = Readonly<{ /** Seven rows (Monday first) of 24 hours. */ rows: readonly (readonly SendTimeSlot[])[]; best: readonly SendTimeSlot[]; total: number }>;

/** A full week grid from the cells that have messages; the metric decides the shading. */
export function layoutSendTimes(cells: readonly SendTimeCell[], metric: SendTimeMetric): SendTimeLayout {
  const byCell = new Map(cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell]));
  const valueOf = ({ sent, replied }: Pick<SendTimeCell, "sent" | "replied">) => (metric === "volume" ? sent : sent >= minimumCellSample ? shareOf(replied, sent) : 0);
  const peak = Math.max(0, ...cells.map(valueOf));

  const rows = Array.from({ length: 7 }, (_, day) => Array.from({ length: 24 }, (_, hour): SendTimeSlot => {
    const cell = byCell.get(`${day + 1}-${hour}`) ?? { weekday: day + 1, hour, sent: 0, replied: 0 };
    return { ...cell, level: heatLevel(valueOf(cell), peak), rated: cell.sent >= minimumCellSample };
  }));

  const best = rows.flat().filter((slot) => slot.rated && slot.replied > 0)
    .sort((left, right) => shareOf(right.replied, right.sent) - shareOf(left.replied, left.sent) || right.sent - left.sent).slice(0, 3);
  return { rows, best, total: cells.reduce((sum, cell) => sum + cell.sent, 0) };
}
