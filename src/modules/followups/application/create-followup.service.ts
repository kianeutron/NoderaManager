import { v7 as uuidv7 } from "uuid";
import type { FollowUpCommandsRepository } from "@/modules/followups/data/followup-commands.repository";
import type { FollowUpRepository } from "@/modules/followups/data/followup.repository";
import type { CreateFollowUpInput } from "@/modules/followups/domain/followup.schema";
import type { CreateFollowUpResult } from "@/modules/followups/domain/followup.types";
import { assertCanLogOutreach } from "@/modules/outreach/domain/outreach-rules";
import type { ProspectRepository } from "@/modules/prospects/data/prospect.repository";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type CreateFollowUpDependencies = Readonly<{
  reads: Pick<FollowUpRepository, "findOpenByReason" | "findMessageProspect" | "findInteractionProspect">;
  prospects: Pick<ProspectRepository, "findProspectContact">;
  commands: Pick<FollowUpCommandsRepository, "insertFollowUp">;
}>;

/**
 * Plans getting back to a prospect. A follow-up is a plan to contact someone, so it follows the rules for contacting them:
 * not for a do-not-contact person, a closed or archived prospect, or an archived contact. Idempotent: an open follow-up on
 * the same prospect with the same reason (ignoring case) is returned instead of adding a second.
 */
export async function createFollowUp({ reads, prospects, commands }: CreateFollowUpDependencies, actor: AuthenticatedActor, input: CreateFollowUpInput): Promise<CreateFollowUpResult> {
  const target = await prospects.findProspectContact(input.prospectId);
  if (!target) throw new ApplicationError("not_found", "Prospect not found");

  const existing = await reads.findOpenByReason(target.prospectId, input.reason);
  if (existing) return { followUpId: existing.id, created: false, auditEventId: null };

  assertCanLogOutreach({
    prospect: { status: target.status, archivedAt: target.archivedAt },
    person: target.personExists ? { archivedAt: target.personArchivedAt, doNotContactAt: target.doNotContactAt } : null,
    organization: target.organizationExists ? { archivedAt: target.organizationArchivedAt } : null
  });

  if (input.originOutreachMessageId && (await reads.findMessageProspect(input.originOutreachMessageId)) !== target.prospectId) throw new ApplicationError("not_found", "Outreach message not found for this prospect", "outreach_message_not_found");
  if (input.originInteractionId && (await reads.findInteractionProspect(input.originInteractionId)) !== target.prospectId) throw new ApplicationError("not_found", "Interaction not found for this prospect", "interaction_not_found");

  const followUpId = uuidv7();
  const auditEventId = await commands.insertFollowUp({
    followUpId,
    prospectId: target.prospectId,
    reason: input.reason,
    dueAt: input.dueAt ?? null,
    notBeforeAt: input.notBeforeAt ?? null,
    suggestedChannel: input.suggestedChannel ?? null,
    originOutreachMessageId: input.originOutreachMessageId ?? null,
    originInteractionId: input.originInteractionId ?? null,
    // The reason is the owner's own planning note, so it stays out of the audit trail like other free text.
    audit: toAuditEvent(actor, {
      action: "follow_up.created",
      entityType: "follow_up",
      entityId: followUpId,
      summary: "Created a follow-up",
      metadata: { prospectId: target.prospectId, dueAt: input.dueAt?.toISOString() ?? null, notBeforeAt: input.notBeforeAt?.toISOString() ?? null, suggestedChannel: input.suggestedChannel ?? null, originOutreachMessageId: input.originOutreachMessageId ?? null, originInteractionId: input.originInteractionId ?? null }
    })
  });

  return { followUpId, created: true, auditEventId };
}
