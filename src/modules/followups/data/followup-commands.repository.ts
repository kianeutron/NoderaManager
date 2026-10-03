import { eq } from "drizzle-orm";
import type { FollowUpChannel } from "@/modules/followups/domain/followup.types";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { followUps } from "@/shared/db/schema/engagement";

type FollowUpsDatabase = ReturnType<typeof getDatabase>;

export type NewFollowUpDraft = Readonly<{
  followUpId: string;
  prospectId: string;
  reason: string;
  dueAt: Date | null;
  notBeforeAt: Date | null;
  suggestedChannel: FollowUpChannel | null;
  originOutreachMessageId: string | null;
  originInteractionId: string | null;
  audit: AuditEventInput;
}>;

export type FollowUpPatch = Readonly<{
  reason?: string;
  dueAt?: Date | null;
  notBeforeAt?: Date | null;
  suggestedChannel?: FollowUpChannel | null;
}>;

/** How an active follow-up ends. Either way the due date goes: the database only allows a due date on an active one. */
export type FollowUpOutcome = Readonly<{ status: "completed"; completedAt: Date }> | Readonly<{ status: "dismissed"; dismissedReason: string }>;

/** Each command is one `batch`, so the change and its audit event commit together or not at all. */
export function createFollowUpCommandsRepository(database: FollowUpsDatabase) {
  return {
    insertFollowUp: async ({ audit: auditInput, followUpId, ...values }: NewFollowUpDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.insert(followUps).values({ id: followUpId, ...values }), audit.statement]);
      return audit.id;
    },

    updateFollowUp: async (followUpId: string, patch: FollowUpPatch, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(followUps).set({ ...patch, updatedAt: new Date() }).where(eq(followUps.id, followUpId)), audit.statement]);
      return audit.id;
    },

    finishFollowUp: async (followUpId: string, outcome: FollowUpOutcome, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(followUps).set({ ...outcome, dueAt: null, updatedAt: new Date() }).where(eq(followUps.id, followUpId)), audit.statement]);
      return audit.id;
    }
  };
}

export type FollowUpCommandsRepository = ReturnType<typeof createFollowUpCommandsRepository>;
