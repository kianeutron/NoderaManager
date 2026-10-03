import { v7 as uuidv7 } from "uuid";
import type { OutreachCommandsRepository } from "@/modules/outreach/data/outreach-commands.repository";
import type { OutreachRepository } from "@/modules/outreach/data/outreach.repository";
import type { CampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import type { ProspectRepository } from "@/modules/prospects/data/prospect.repository";
import { assertCanLogOutreach, statusAfterOutreach } from "@/modules/outreach/domain/outreach-rules";
import type { LogOutreachInput } from "@/modules/outreach/domain/outreach.schema";
import type { LogOutreachResult } from "@/modules/outreach/domain/outreach.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { fingerprintOf } from "@/shared/idempotency/fingerprint";
import { idempotencyLifetimeMilliseconds, type IdempotencyRepository } from "@/shared/idempotency/idempotency.repository";

type LogOutreachDependencies = Readonly<{
  reads: Pick<OutreachRepository, "findRecentDuplicate">;
  idempotency: Pick<IdempotencyRepository, "find">;
  prospects: Pick<ProspectRepository, "findProspectContact">;
  campaigns: Pick<CampaignRepository, "findMembership">;
  commands: Pick<OutreachCommandsRepository, "insertMessage">;
}>;

const operation = "log_outreach";

/**
 * Records a message that was already sent, and in the same commit updates what sending changes: the prospect's and the
 * person's last-contacted time and, for a first contact, the prospect's status. Who it went to comes from the prospect.
 * Idempotent: a repeated idempotency key, or identical text sent to the same prospect on the same channel moments ago,
 * returns the first message. The same key with different text is refused as misuse.
 */
export async function logOutreach({ reads, idempotency, prospects, campaigns, commands }: LogOutreachDependencies, actor: AuthenticatedActor, input: LogOutreachInput): Promise<LogOutreachResult> {
  const target = await prospects.findProspectContact(input.prospectId);
  if (!target) throw new ApplicationError("not_found", "Prospect not found");

  const subject = input.subject ?? null;
  // The send time is left out: a retry without one would otherwise always differ.
  const fingerprint = fingerprintOf([target.prospectId, input.campaignId ?? null, input.channel, subject, input.body]);

  if (input.idempotencyKey) {
    const earlier = await idempotency.find(operation, actor.source, input.idempotencyKey);
    if (earlier?.resultEntityId) {
      if (earlier.fingerprint !== fingerprint) throw new ApplicationError("conflict", "That idempotencyKey was already used for a different message.", "idempotency_key_reused");
      return { messageId: earlier.resultEntityId, created: false, auditEventId: null, prospectStatus: target.status };
    }
  } else {
    const duplicate = await reads.findRecentDuplicate({ prospectId: target.prospectId, channel: input.channel, subject, body: input.body });
    if (duplicate) return { messageId: duplicate.id, created: false, auditEventId: null, prospectStatus: target.status };
  }

  assertCanLogOutreach({
    prospect: { status: target.status, archivedAt: target.archivedAt },
    person: target.personExists ? { archivedAt: target.personArchivedAt, doNotContactAt: target.doNotContactAt } : null,
    organization: target.organizationExists ? { archivedAt: target.organizationArchivedAt } : null
  });

  if (input.campaignId) {
    const membership = await campaigns.findMembership(input.campaignId, target.prospectId);
    if (!membership || membership.archivedAt !== null) throw new ApplicationError("not_found", "Campaign not found", "campaign_not_found");
    if (!membership.isMember) throw new ApplicationError("conflict", "The prospect is not part of that campaign.", "prospect_not_in_campaign");
    if (membership.status !== "active") throw new ApplicationError("conflict", "Outreach can only be logged under an active campaign.", "campaign_not_active");
  }

  const nextStatus = statusAfterOutreach(target.status);
  const messageId = uuidv7();
  const sentAt = input.sentAt ?? new Date();

  const auditEventId = await commands.insertMessage({
    messageId,
    prospectId: target.prospectId,
    personId: target.personId,
    organizationId: target.organizationId,
    routeId: target.routeId,
    routeModuleId: target.routeModuleId,
    campaignId: input.campaignId ?? null,
    channel: input.channel,
    subject,
    body: input.body,
    sentAt,
    newProspectStatus: nextStatus === target.status ? null : nextStatus,
    idempotency: input.idempotencyKey ? { operation, source: actor.source, key: input.idempotencyKey, fingerprint, expiresAt: new Date(Date.now() + idempotencyLifetimeMilliseconds) } : null,
    // The message text stays out of the audit trail; who, where and what changed is enough.
    audit: toAuditEvent(actor, {
      action: "outreach.logged",
      entityType: "outreach_message",
      entityId: messageId,
      summary: `Logged ${input.channel} outreach`,
      metadata: { prospectId: target.prospectId, campaignId: input.campaignId ?? null, channel: input.channel, sentAt: sentAt.toISOString(), hasSubject: subject !== null, statusChange: nextStatus === target.status ? null : { from: target.status, to: nextStatus } }
    })
  });

  return { messageId, created: true, auditEventId, prospectStatus: nextStatus };
}
