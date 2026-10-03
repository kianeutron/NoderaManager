import { eq } from "drizzle-orm";
import type { ProspectSource, ProspectStatus, ProspectTemperature, SignalType, StructuralReason } from "@/modules/prospects/domain/prospect.types";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { prospects } from "@/shared/db/schema/core";
import { signals } from "@/shared/db/schema/strategy";

type ProspectsDatabase = ReturnType<typeof getDatabase>;

export type NewProspectDraft = Readonly<{
  prospectId: string;
  personId: string | null;
  organizationId: string | null;
  routeId: string;
  routeModuleId: string | null;
  status: ProspectStatus;
  temperature: ProspectTemperature | null;
  source: ProspectSource | null;
  whyTargeted: string | null;
  currentTrigger: string | null;
  nextAction: string | null;
  audit: AuditEventInput;
}>;

export type ProspectPatch = Readonly<{
  routeId?: string;
  routeModuleId?: string | null;
  temperature?: ProspectTemperature | null;
  source?: ProspectSource | null;
  whyTargeted?: string | null;
  currentTrigger?: string | null;
  nextAction?: string | null;
}>;

export type NewSignalDraft = Readonly<{
  signalId: string;
  prospectId: string;
  type: SignalType;
  summary: string;
  sourceUrl: string | null;
  observedAt: Date | null;
  expiresAt: Date | null;
  audit: AuditEventInput;
}>;

/** Each command is one `batch`, so the mutation and its audit event commit together or not at all. */
export function createProspectCommandsRepository(database: ProspectsDatabase) {
  return {
    insertProspect: async ({ audit: auditInput, prospectId, ...values }: NewProspectDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.insert(prospects).values({ id: prospectId, ...values }), audit.statement]);
      return audit.id;
    },

    updateProspect: async (prospectId: string, patch: ProspectPatch, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(prospects).set({ ...patch, updatedAt: new Date() }).where(eq(prospects.id, prospectId)), audit.statement]);
      return audit.id;
    },

    updateStatus: async (prospectId: string, change: Readonly<{ status: ProspectStatus; structuralReason: StructuralReason | null }>, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      const now = new Date();
      await database.batch([database.update(prospects).set({ ...change, statusChangedAt: now, updatedAt: now }).where(eq(prospects.id, prospectId)), audit.statement]);
      return audit.id;
    },

    /** Adding evidence counts as activity on the prospect, so it moves up the recently-updated order. */
    insertSignal: async ({ audit: auditInput, signalId, observedAt, ...values }: NewSignalDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.insert(signals).values({ id: signalId, ...values, ...(observedAt ? { observedAt } : {}) }),
        database.update(prospects).set({ updatedAt: new Date() }).where(eq(prospects.id, values.prospectId)),
        audit.statement
      ]);
      return audit.id;
    }
  };
}

export type ProspectCommandsRepository = ReturnType<typeof createProspectCommandsRepository>;
