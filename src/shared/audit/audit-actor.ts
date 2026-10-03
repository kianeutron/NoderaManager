import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { AuthenticatedActor } from "@/shared/auth/actor";

type AuditFacts = Pick<AuditEventInput, "action" | "entityType" | "entityId" | "summary"> & Partial<Pick<AuditEventInput, "metadata">>;

/** Actor identity always comes from verified auth context, never from the caller's payload (authz-policy.md). */
export function toAuditEvent(actor: AuthenticatedActor, facts: AuditFacts): AuditEventInput {
  return { actorType: actor.type, actorId: actor.id, requestId: actor.requestId, source: actor.source, metadata: {}, ...facts };
}
