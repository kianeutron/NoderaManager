import type { FollowUpCommandsRepository } from "@/modules/followups/data/followup-commands.repository";
import type { FollowUpRepository } from "@/modules/followups/data/followup.repository";
import { assertActive } from "@/modules/followups/domain/followup-rules";
import type { DismissFollowUpInput, FollowUpIdInput } from "@/modules/followups/domain/followup.schema";
import type { FinishFollowUpResult } from "@/modules/followups/domain/followup.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type FinishFollowUpDependencies = Readonly<{
  reads: Pick<FollowUpRepository, "findFollowUp">;
  commands: Pick<FollowUpCommandsRepository, "finishFollowUp">;
}>;

async function requireFollowUp(reads: FinishFollowUpDependencies["reads"], followUpId: string) {
  const followUp = await reads.findFollowUp(followUpId);
  if (!followUp) throw new ApplicationError("not_found", "Follow-up not found");
  return followUp;
}

/** Marks an active follow-up done. Repeating it is a no-op; completing one that was dismissed is refused. */
export async function completeFollowUp({ reads, commands }: FinishFollowUpDependencies, actor: AuthenticatedActor, input: FollowUpIdInput): Promise<FinishFollowUpResult> {
  const followUp = await requireFollowUp(reads, input.followUpId);
  if (followUp.status === "completed") return { followUpId: followUp.id, status: "completed", changed: false, auditEventId: null };
  assertActive(followUp.status);

  const auditEventId = await commands.finishFollowUp(followUp.id, { status: "completed", completedAt: new Date() }, toAuditEvent(actor, {
    action: "follow_up.completed",
    entityType: "follow_up",
    entityId: followUp.id,
    summary: "Completed a follow-up",
    metadata: { prospectId: followUp.prospectId }
  }));

  return { followUpId: followUp.id, status: "completed", changed: true, auditEventId };
}

/** Lets an active follow-up go, keeping why. Repeating it is a no-op; dismissing one that was completed is refused. */
export async function dismissFollowUp({ reads, commands }: FinishFollowUpDependencies, actor: AuthenticatedActor, input: DismissFollowUpInput): Promise<FinishFollowUpResult> {
  const followUp = await requireFollowUp(reads, input.followUpId);
  if (followUp.status === "dismissed") return { followUpId: followUp.id, status: "dismissed", changed: false, auditEventId: null };
  assertActive(followUp.status);

  const auditEventId = await commands.finishFollowUp(followUp.id, { status: "dismissed", dismissedReason: input.reason }, toAuditEvent(actor, {
    action: "follow_up.dismissed",
    entityType: "follow_up",
    entityId: followUp.id,
    summary: "Dismissed a follow-up",
    metadata: { prospectId: followUp.prospectId }
  }));

  return { followUpId: followUp.id, status: "dismissed", changed: true, auditEventId };
}
