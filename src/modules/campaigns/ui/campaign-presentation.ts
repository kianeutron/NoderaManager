import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";
import { formatDate } from "@/shared/lib/format-date";

type ChipColor = "default" | "primary" | "info" | "warning" | "success" | "error";

/** Label and color per lifecycle status. `satisfies` makes a new status a type error until it has both. */
export const campaignStatusMeta = {
  draft: { label: "Draft", color: "default" },
  active: { label: "Active", color: "success" },
  paused: { label: "Paused", color: "warning" },
  completed: { label: "Completed", color: "info" }
} as const satisfies Record<CampaignStatus, { label: string; color: ChipColor }>;

/** What the owner can do next from each status, in the order the buttons appear. Completing is final, so it asks first. */
export const campaignNextSteps = {
  draft: [{ to: "active", label: "Start", confirm: false }],
  active: [{ to: "paused", label: "Pause", confirm: false }, { to: "completed", label: "Complete", confirm: true }],
  paused: [{ to: "active", label: "Resume", confirm: false }, { to: "completed", label: "Complete", confirm: true }],
  completed: []
} as const satisfies Record<CampaignStatus, readonly { to: CampaignStatus; label: string; confirm: boolean }[]>;

/** "Oct 1, 2026 to Dec 1, 2026", "From Oct 1, 2026", "Until Dec 1, 2026" or "No dates". */
export function describeWindow(startsAt: string | null, endsAt: string | null): string {
  if (startsAt && endsAt) return `${formatDate(startsAt)} to ${formatDate(endsAt)}`;
  if (startsAt) return `From ${formatDate(startsAt)}`;
  return endsAt ? `Until ${formatDate(endsAt)}` : "No dates";
}
