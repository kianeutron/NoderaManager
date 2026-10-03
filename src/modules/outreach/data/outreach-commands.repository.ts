import { eq } from "drizzle-orm";
import type { OutreachChannel } from "@/modules/outreach/domain/outreach.types";
import type { ProspectStatus } from "@/modules/prospects/domain/prospect.types";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { latestTimestamp } from "@/shared/db/latest-timestamp";
import { people, prospects } from "@/shared/db/schema/core";
import { outreachMessages } from "@/shared/db/schema/engagement";
import { prepareIdempotencyRecord, type IdempotencyEntry } from "@/shared/idempotency/idempotency.repository";

type OutreachDatabase = ReturnType<typeof getDatabase>;

export type NewOutreachDraft = Readonly<{
  messageId: string;
  prospectId: string;
  personId: string | null;
  organizationId: string | null;
  routeId: string;
  routeModuleId: string | null;
  campaignId: string | null;
  channel: OutreachChannel;
  subject: string | null;
  body: string;
  sentAt: Date;
  /** The status the prospect moves to, when sending changes it. */
  newProspectStatus: ProspectStatus | null;
  idempotency: Omit<IdempotencyEntry, "resultEntityType" | "resultEntityId"> | null;
  audit: AuditEventInput;
}>;

/** One `batch`: the message, the prospect and person it touches, the replay record and the audit event commit together or not at all. */
export function createOutreachCommandsRepository(database: OutreachDatabase) {
  return {
    insertMessage: async ({ audit: auditInput, messageId, newProspectStatus, idempotency, sentAt, ...values }: NewOutreachDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      const now = new Date();
      await database.batch([
        database.insert(outreachMessages).values({ id: messageId, sentAt, ...values }),
        database.update(prospects).set({ lastContactedAt: latestTimestamp(prospects.lastContactedAt, sentAt), updatedAt: now, ...(newProspectStatus ? { status: newProspectStatus, statusChangedAt: now } : {}) }).where(eq(prospects.id, values.prospectId)),
        ...(values.personId ? [database.update(people).set({ lastContactedAt: latestTimestamp(people.lastContactedAt, sentAt), updatedAt: now }).where(eq(people.id, values.personId))] : []),
        ...(idempotency ? [prepareIdempotencyRecord(database, { ...idempotency, resultEntityType: "outreach_message", resultEntityId: messageId })] : []),
        audit.statement
      ]);
      return audit.id;
    }
  };
}

export type OutreachCommandsRepository = ReturnType<typeof createOutreachCommandsRepository>;
