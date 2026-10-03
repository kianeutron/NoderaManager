import type { ProspectCommandsRepository } from "@/modules/prospects/data/prospect-commands.repository";
import type { ProspectRepository } from "@/modules/prospects/data/prospect.repository";
import { resolveStructuralReason } from "@/modules/prospects/domain/prospect-status";
import type { UpdateProspectStatusInput } from "@/modules/prospects/domain/prospect.schema";
import type { UpdateProspectStatusResult } from "@/modules/prospects/domain/prospect.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type UpdateProspectStatusDependencies = Readonly<{
  reads: Pick<ProspectRepository, "findProspect">;
  commands: Pick<ProspectCommandsRepository, "updateStatus">;
}>;

/**
 * Any status may follow any other (not every prospect passes every state), with one rule: disqualifying needs a
 * structural reason, and that reason is cleared on every other status. Setting the current status again is a no-op.
 */
export async function updateProspectStatus({ reads, commands }: UpdateProspectStatusDependencies, actor: AuthenticatedActor, input: UpdateProspectStatusInput): Promise<UpdateProspectStatusResult> {
  const current = await reads.findProspect(input.prospectId);
  if (!current) throw new ApplicationError("not_found", "Prospect not found");

  const structuralReason = resolveStructuralReason(input.status, input.structuralReason);
  if (current.status === input.status && current.structuralReason === structuralReason) return { prospectId: current.id, status: current.status, previousStatus: current.status, changed: false, auditEventId: null };

  const auditEventId = await commands.updateStatus(current.id, { status: input.status, structuralReason }, toAuditEvent(actor, {
    action: "prospect.status_changed",
    entityType: "prospect",
    entityId: current.id,
    summary: `Moved a prospect from ${current.status} to ${input.status}`,
    metadata: { from: current.status, to: input.status, structuralReason }
  }));

  return { prospectId: current.id, status: input.status, previousStatus: current.status, changed: true, auditEventId };
}
