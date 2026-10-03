import { eq } from "drizzle-orm";
import type { BounceStatus, InteractionChannel, InteractionDirection, InteractionType, Sentiment } from "@/modules/interactions/domain/interaction.types";
import type { ProspectStatus } from "@/modules/prospects/domain/prospect.types";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { latestTimestamp } from "@/shared/db/latest-timestamp";
import { people, prospects } from "@/shared/db/schema/core";
import { interactions, outreachMessages } from "@/shared/db/schema/engagement";
import { prepareIdempotencyRecord, type IdempotencyEntry } from "@/shared/idempotency/idempotency.repository";

type InteractionsDatabase = ReturnType<typeof getDatabase>;

export type NewInteractionDraft = Readonly<{
  interactionId: string;
  prospectId: string;
  /** Set only for what we sent: something they sent is not us contacting them. */
  contactedPersonId: string | null;
  outreachMessageId: string | null;
  direction: InteractionDirection;
  channel: InteractionChannel;
  type: InteractionType;
  occurredAt: Date;
  subject: string | null;
  body: string | null;
  responseDepth: number | null;
  sentiment: Sentiment | null;
  /** True for something we sent: it counts as contact. */
  countsAsContact: boolean;
  newProspectStatus: ProspectStatus | null;
  /** The reply state to set on the message being answered, when this changes it. */
  newMessageReplyStatus: "replied" | "auto_reply" | null;
  idempotency: Omit<IdempotencyEntry, "resultEntityType" | "resultEntityId"> | null;
  audit: AuditEventInput;
}>;

export type NewBounceDraft = Readonly<{
  interactionId: string;
  prospectId: string;
  outreachMessageId: string;
  channel: InteractionChannel;
  bounceStatus: BounceStatus;
  occurredAt: Date;
  audit: AuditEventInput;
}>;

/** Each command is one `batch`: the interaction, everything it changes and the audit event commit together or not at all. */
export function createInteractionCommandsRepository(database: InteractionsDatabase) {
  return {
    insertInteraction: async ({ audit: auditInput, idempotency, contactedPersonId, countsAsContact, newProspectStatus, newMessageReplyStatus, interactionId, ...values }: NewInteractionDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      const now = new Date();
      await database.batch([
        database.insert(interactions).values({ id: interactionId, ...values }),
        database.update(prospects).set({ updatedAt: now, ...(countsAsContact ? { lastContactedAt: latestTimestamp(prospects.lastContactedAt, values.occurredAt) } : {}), ...(newProspectStatus ? { status: newProspectStatus, statusChangedAt: now } : {}) }).where(eq(prospects.id, values.prospectId)),
        ...(contactedPersonId ? [database.update(people).set({ lastContactedAt: latestTimestamp(people.lastContactedAt, values.occurredAt), updatedAt: now }).where(eq(people.id, contactedPersonId))] : []),
        ...(newMessageReplyStatus && values.outreachMessageId ? [database.update(outreachMessages).set({ replyStatus: newMessageReplyStatus, updatedAt: now }).where(eq(outreachMessages.id, values.outreachMessageId))] : []),
        ...(idempotency ? [prepareIdempotencyRecord(database, { ...idempotency, resultEntityType: "interaction", resultEntityId: interactionId })] : []),
        audit.statement
      ]);
      return audit.id;
    },

    /** A bounce means the message was not delivered, so the delivery state follows (the database refuses "delivered" with a bounce). */
    recordBounce: async ({ audit: auditInput, interactionId, bounceStatus, ...values }: NewBounceDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      const now = new Date();
      await database.batch([
        database.insert(interactions).values({ id: interactionId, direction: "inbound", type: "bounce_notice", metadata: { bounceStatus }, ...values }),
        database.update(outreachMessages).set({ bounceStatus, deliveryStatus: "failed", updatedAt: now }).where(eq(outreachMessages.id, values.outreachMessageId)),
        audit.statement
      ]);
      return audit.id;
    }
  };
}

export type InteractionCommandsRepository = ReturnType<typeof createInteractionCommandsRepository>;
