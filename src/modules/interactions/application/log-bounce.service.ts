import { v7 as uuidv7 } from "uuid";
import type { InteractionCommandsRepository } from "@/modules/interactions/data/interaction-commands.repository";
import type { InteractionRepository } from "@/modules/interactions/data/interaction.repository";
import type { LogBounceInput } from "@/modules/interactions/domain/interaction.schema";
import type { LogBounceResult } from "@/modules/interactions/domain/interaction.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type LogBounceDependencies = Readonly<{
  reads: Pick<InteractionRepository, "findMessage">;
  commands: Pick<InteractionCommandsRepository, "recordBounce">;
}>;

/**
 * Reports that a sent message bounced: the message's bounce state is set, its delivery state becomes failed, and the
 * bounce is kept in the prospect's timeline. Reporting the same bounce again is a no-op, which makes a retry safe without a key.
 */
export async function logBounce({ reads, commands }: LogBounceDependencies, actor: AuthenticatedActor, input: LogBounceInput): Promise<LogBounceResult> {
  const message = await reads.findMessage(input.outreachMessageId);
  if (!message) throw new ApplicationError("not_found", "Outreach message not found", "outreach_message_not_found");
  if (message.bounceStatus === input.bounceStatus) return { outreachMessageId: message.id, bounceStatus: message.bounceStatus, changed: false, auditEventId: null };

  const interactionId = uuidv7();
  const occurredAt = input.occurredAt ?? new Date();
  const auditEventId = await commands.recordBounce({
    interactionId,
    prospectId: message.prospectId,
    outreachMessageId: message.id,
    channel: message.channel,
    bounceStatus: input.bounceStatus,
    occurredAt,
    audit: toAuditEvent(actor, {
      action: "outreach.bounce_logged",
      entityType: "outreach_message",
      entityId: message.id,
      summary: `Logged a ${input.bounceStatus} bounce`,
      metadata: { prospectId: message.prospectId, interactionId, bounceStatus: input.bounceStatus, previousBounceStatus: message.bounceStatus, occurredAt: occurredAt.toISOString() }
    })
  });

  return { outreachMessageId: message.id, bounceStatus: input.bounceStatus, changed: true, auditEventId };
}
