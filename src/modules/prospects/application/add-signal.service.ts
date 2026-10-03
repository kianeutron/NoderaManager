import { v7 as uuidv7 } from "uuid";
import type { ProspectCommandsRepository } from "@/modules/prospects/data/prospect-commands.repository";
import type { ProspectRepository } from "@/modules/prospects/data/prospect.repository";
import type { AddSignalInput } from "@/modules/prospects/domain/prospect.schema";
import type { AddSignalResult } from "@/modules/prospects/domain/prospect.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type AddSignalDependencies = Readonly<{
  reads: Pick<ProspectRepository, "findProspect" | "findSignal">;
  commands: Pick<ProspectCommandsRepository, "insertSignal">;
}>;

/** Idempotent: the same type and summary (case-insensitive) on the same prospect is returned instead of a duplicate. */
export async function addSignal({ reads, commands }: AddSignalDependencies, actor: AuthenticatedActor, input: AddSignalInput): Promise<AddSignalResult> {
  if (!(await reads.findProspect(input.prospectId))) throw new ApplicationError("not_found", "Prospect not found");

  const existing = await reads.findSignal(input.prospectId, input.type, input.summary);
  if (existing) return { signalId: existing.id, created: false, auditEventId: null };

  const signalId = uuidv7();
  const auditEventId = await commands.insertSignal({
    signalId,
    prospectId: input.prospectId,
    type: input.type,
    summary: input.summary,
    sourceUrl: input.sourceUrl ?? null,
    observedAt: input.observedAt ?? null,
    expiresAt: input.expiresAt ?? null,
    audit: toAuditEvent(actor, { action: "signal.added", entityType: "signal", entityId: signalId, summary: `Recorded a ${input.type.replaceAll("_", " ")} signal`, metadata: { prospectId: input.prospectId, type: input.type } })
  });

  return { signalId, created: true, auditEventId };
}
