import type { ProspectSource, ProspectStatus, ProspectTemperature, StructuralReason } from "@/modules/prospects/domain/prospect.types";

type ChipColor = "default" | "primary" | "info" | "warning" | "success" | "error";

/** Label and color per lifecycle status. `satisfies` makes a new status a type error until it has both. */
export const prospectStatusMeta = {
  researched: { label: "Researched", color: "default" },
  ready: { label: "Ready", color: "info" },
  contacted: { label: "Contacted", color: "primary" },
  replied: { label: "Replied", color: "primary" },
  warm: { label: "Warm", color: "warning" },
  opportunity: { label: "Opportunity", color: "success" },
  proposal: { label: "Proposal", color: "success" },
  won: { label: "Won", color: "success" },
  lost: { label: "Lost", color: "default" },
  dormant: { label: "Dormant", color: "default" },
  disqualified: { label: "Disqualified", color: "error" }
} as const satisfies Record<ProspectStatus, { label: string; color: ChipColor }>;

export const temperatureLabel = { cold: "Cold", warm: "Warm", hot: "Hot" } as const satisfies Record<ProspectTemperature, string>;

export const sourceLabel = {
  linkedin_search: "LinkedIn search",
  referral: "Referral",
  inbound: "Inbound",
  community: "Community",
  event: "Event",
  research_document: "Research document",
  import: "Import",
  other: "Other"
} as const satisfies Record<ProspectSource, string>;

export const structuralReasonLabel = {
  language: "Language",
  local_payroll: "Needs local payroll",
  residency: "Residency",
  clearance: "Security clearance",
  compliance: "Compliance",
  other: "Other"
} as const satisfies Record<StructuralReason, string>;

/** A new prospect starts researched or ready; every other status comes later (docs/11-operations/00-status-taxonomy.md). */
export const startingStatuses = ["researched", "ready"] as const satisfies readonly ProspectStatus[];
