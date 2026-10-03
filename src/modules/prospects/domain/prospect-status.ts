import type { StructuralReason } from "@/modules/prospects/domain/prospect.types";
import { ApplicationError } from "@/shared/errors/application-error";
import type { prospectStatusValues } from "@/shared/db/schema/crm-values";

type ProspectStatus = (typeof prospectStatusValues)[number];

/** Statuses a prospect has finished with. A new prospect for the same target and route may be opened after these. */
export const closedProspectStatuses = ["won", "lost", "disqualified"] as const satisfies readonly ProspectStatus[];

/**
 * The structural reason (language, residency, ...) explains a disqualification and is stored apart from timing
 * (docs/11-operations/00-status-taxonomy.md). It is required when disqualifying and cleared on any other status.
 */
export function resolveStructuralReason(status: ProspectStatus, requested: StructuralReason | undefined): StructuralReason | null {
  if (status === "disqualified") {
    if (requested === undefined) throw new ApplicationError("conflict", "A disqualified prospect needs a structuralReason (language, local_payroll, residency, clearance, compliance or other). For a timing-only no, use dormant with a follow-up instead.", "structural_reason_required");
    return requested;
  }
  if (requested !== undefined) throw new ApplicationError("conflict", "structuralReason applies only to disqualified prospects.", "structural_reason_not_applicable");
  return null;
}
