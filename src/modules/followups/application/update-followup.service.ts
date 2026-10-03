import type { FollowUpCommandsRepository, FollowUpPatch } from "@/modules/followups/data/followup-commands.repository";
import type { FollowUpRepository } from "@/modules/followups/data/followup.repository";
import { assertActive, assertDatesInOrder } from "@/modules/followups/domain/followup-rules";
import type { UpdateFollowUpInput } from "@/modules/followups/domain/followup.schema";
import type { UpdateFollowUpResult } from "@/modules/followups/domain/followup.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type UpdateFollowUpDependencies = Readonly<{
  reads: Pick<FollowUpRepository, "findFollowUp">;
  commands: Pick<FollowUpCommandsRepository, "updateFollowUp">;
}>;

const sameInstant = (left: Date | null, right: Date | null) => (left?.getTime() ?? null) === (right?.getTime() ?? null);

/** Changes an active follow-up's reason, dates or suggested channel. Only real differences are written and audited; a finished follow-up cannot change. */
export async function updateFollowUp({ reads, commands }: UpdateFollowUpDependencies, actor: AuthenticatedActor, input: UpdateFollowUpInput): Promise<UpdateFollowUpResult> {
  const current = await reads.findFollowUp(input.followUpId);
  if (!current) throw new ApplicationError("not_found", "Follow-up not found");
  assertActive(current.status);

  const patch: { -readonly [Field in keyof FollowUpPatch]: FollowUpPatch[Field] } = {};
  if (input.reason !== undefined && input.reason !== current.reason) patch.reason = input.reason;
  if (input.dueAt !== undefined && !sameInstant(input.dueAt, current.dueAt)) patch.dueAt = input.dueAt;
  if (input.notBeforeAt !== undefined && !sameInstant(input.notBeforeAt, current.notBeforeAt)) patch.notBeforeAt = input.notBeforeAt;
  if (input.suggestedChannel !== undefined && input.suggestedChannel !== current.suggestedChannel) patch.suggestedChannel = input.suggestedChannel;
  if (Object.keys(patch).length === 0) return { followUpId: current.id, changed: false, auditEventId: null };

  assertDatesInOrder(patch.notBeforeAt !== undefined ? patch.notBeforeAt : current.notBeforeAt, patch.dueAt !== undefined ? patch.dueAt : current.dueAt);

  const auditEventId = await commands.updateFollowUp(current.id, patch, toAuditEvent(actor, {
    action: "follow_up.updated",
    entityType: "follow_up",
    entityId: current.id,
    summary: `Updated ${Object.keys(patch).join(", ")} of a follow-up`,
    metadata: { prospectId: current.prospectId, changed: Object.keys(patch), dueAt: patch.dueAt === undefined ? undefined : patch.dueAt?.toISOString() ?? null }
  }));

  return { followUpId: current.id, changed: true, auditEventId };
}
