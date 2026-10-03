import { v7 as uuidv7 } from "uuid";
import type { InteractionCommandsRepository } from "@/modules/interactions/data/interaction-commands.repository";
import type { InteractionRepository } from "@/modules/interactions/data/interaction.repository";
import { assertCanLogInteraction, replyStatusAfter, statusAfterInteraction } from "@/modules/interactions/domain/interaction-rules";
import type { LogInteractionInput } from "@/modules/interactions/domain/interaction.schema";
import type { LogInteractionResult } from "@/modules/interactions/domain/interaction.types";
import type { ProspectRepository } from "@/modules/prospects/data/prospect.repository";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { fingerprintOf } from "@/shared/idempotency/fingerprint";
import { idempotencyLifetimeMilliseconds, type IdempotencyRepository } from "@/shared/idempotency/idempotency.repository";

type LogInteractionDependencies = Readonly<{
  reads: Pick<InteractionRepository, "findMessage" | "findRecentDuplicate">;
  idempotency: Pick<IdempotencyRepository, "find">;
  prospects: Pick<ProspectRepository, "findProspectContact">;
  commands: Pick<InteractionCommandsRepository, "insertInteraction">;
}>;

const operation = "log_interaction";

/**
 * Records something that happened with a prospect after the first message: their reply, a call, a meeting, a follow-up
 * we sent. In the same commit it updates what that changes: their reply moves a contacted prospect to `replied` and marks
 * the message it answers; anything we send counts as contact (last-contacted, and a first contact's status).
 * Idempotent like `logOutreach`: a repeated key, or the same thing recorded moments ago, returns the first result.
 */
export async function logInteraction({ reads, idempotency, prospects, commands }: LogInteractionDependencies, actor: AuthenticatedActor, input: LogInteractionInput): Promise<LogInteractionResult> {
  const target = await prospects.findProspectContact(input.prospectId);
  if (!target) throw new ApplicationError("not_found", "Prospect not found");

  const message = input.outreachMessageId ? await reads.findMessage(input.outreachMessageId) : null;
  if (input.outreachMessageId && message?.prospectId !== target.prospectId) throw new ApplicationError("not_found", "Outreach message not found for this prospect", "outreach_message_not_found");

  const subject = input.subject ?? null;
  const body = input.body ?? null;
  const outreachMessageId = message?.id ?? null;
  // The time is left out: a retry without one would otherwise always differ.
  const fingerprint = fingerprintOf([target.prospectId, outreachMessageId, input.type, input.direction, input.channel, subject, body]);
  const unchanged = { prospectStatus: target.status, messageReplyStatus: message?.replyStatus ?? null };

  if (input.idempotencyKey) {
    const earlier = await idempotency.find(operation, actor.source, input.idempotencyKey);
    if (earlier?.resultEntityId) {
      if (earlier.fingerprint !== fingerprint) throw new ApplicationError("conflict", "That idempotencyKey was already used for a different interaction.", "idempotency_key_reused");
      return { interactionId: earlier.resultEntityId, created: false, auditEventId: null, ...unchanged };
    }
  } else {
    const duplicate = await reads.findRecentDuplicate({ prospectId: target.prospectId, outreachMessageId, type: input.type, direction: input.direction, body });
    if (duplicate) return { interactionId: duplicate.id, created: false, auditEventId: null, ...unchanged };
  }

  assertCanLogInteraction({
    prospect: { status: target.status, archivedAt: target.archivedAt },
    person: target.personExists ? { archivedAt: target.personArchivedAt, doNotContactAt: target.doNotContactAt } : null,
    organization: target.organizationExists ? { archivedAt: target.organizationArchivedAt } : null
  }, input.direction);

  const nextStatus = statusAfterInteraction(target.status, input.type, input.direction);
  const newMessageReplyStatus = message ? replyStatusAfter(input.type, message.replyStatus) : null;
  const interactionId = uuidv7();
  const occurredAt = input.occurredAt ?? new Date();
  const isOutbound = input.direction === "outbound";

  const auditEventId = await commands.insertInteraction({
    interactionId,
    prospectId: target.prospectId,
    contactedPersonId: isOutbound ? target.personId : null,
    outreachMessageId,
    direction: input.direction,
    channel: input.channel,
    type: input.type,
    occurredAt,
    subject,
    body,
    responseDepth: input.responseDepth ?? null,
    sentiment: input.sentiment ?? null,
    countsAsContact: isOutbound,
    newProspectStatus: nextStatus === target.status ? null : nextStatus,
    newMessageReplyStatus: newMessageReplyStatus === "none" ? null : newMessageReplyStatus,
    idempotency: input.idempotencyKey ? { operation, source: actor.source, key: input.idempotencyKey, fingerprint, expiresAt: new Date(Date.now() + idempotencyLifetimeMilliseconds) } : null,
    // What was said stays out of the audit trail; what happened and what it changed is enough.
    audit: toAuditEvent(actor, {
      action: "interaction.logged",
      entityType: "interaction",
      entityId: interactionId,
      summary: `Logged ${input.direction} ${input.type.replaceAll("_", " ")}`,
      metadata: {
        prospectId: target.prospectId, outreachMessageId, type: input.type, direction: input.direction, channel: input.channel, occurredAt: occurredAt.toISOString(),
        responseDepth: input.responseDepth ?? null, sentiment: input.sentiment ?? null, statusChange: nextStatus === target.status ? null : { from: target.status, to: nextStatus }
      }
    })
  });

  return { interactionId, created: true, auditEventId, prospectStatus: nextStatus, messageReplyStatus: newMessageReplyStatus ?? message?.replyStatus ?? null };
}
