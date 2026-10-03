export type Change = Readonly<{ direction: "up" | "down" | "flat" | "new"; percent: number }>;

/** How `current` moved against `previous`. From nothing to something is "new", not an infinite percentage. */
export function changeBetween(current: number, previous: number): Change {
  if (current === previous) return { direction: "flat", percent: 0 };
  if (previous === 0) return { direction: "new", percent: 0 };
  const percent = Math.round(Math.abs(current - previous) / previous * 100);
  return { direction: current > previous ? "up" : "down", percent };
}

/** `current / total` as a share between 0 and 1, and 0 when there is nothing to divide. */
export const shareOf = (part: number, whole: number): number => (whole <= 0 ? 0 : Math.min(1, Math.max(0, part / whole)));

export const formatPercent = (share: number): string => `${Math.round(share * 100)}%`;
