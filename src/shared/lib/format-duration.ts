/** "35 min", "4.5 h" or "2.3 days" for a span in hours, in the unit a person would say it in. */
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Number(hours.toFixed(1))} h`;
  const days = Number((hours / 24).toFixed(1));
  return `${days} ${days === 1 ? "day" : "days"}`;
}
