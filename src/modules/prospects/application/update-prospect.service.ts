import { requireRouting } from "@/modules/prospects/application/require-routing";
import type { ProspectCommandsRepository, ProspectPatch } from "@/modules/prospects/data/prospect-commands.repository";
import type { ProspectRepository } from "@/modules/prospects/data/prospect.repository";
import type { UpdateProspectInput } from "@/modules/prospects/domain/prospect.schema";
import type { UpdateProspectResult } from "@/modules/prospects/domain/prospect.types";
import type { RouteRepository } from "@/modules/routes/data/route.repository";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import { toChangeMetadata } from "@/shared/audit/change-metadata";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { pickChangedFields } from "@/shared/lib/changed-fields";

type UpdateProspectDependencies = Readonly<{
  reads: Pick<ProspectRepository, "findProspect">;
  routes: Pick<RouteRepository, "findRoute" | "findModule">;
  commands: Pick<ProspectCommandsRepository, "updateProspect">;
}>;

const editableFields = ["temperature", "source", "whyTargeted", "currentTrigger", "nextAction"] as const;
// The qualification notes are named as changed but their text never enters the audit trail.
const redactedFields = ["whyTargeted", "currentTrigger", "nextAction"];

/** Status has its own command. Changing the route without naming a module clears the module, since modules belong to one route. */
export async function updateProspect({ reads, routes, commands }: UpdateProspectDependencies, actor: AuthenticatedActor, input: UpdateProspectInput): Promise<UpdateProspectResult> {
  const current = await reads.findProspect(input.prospectId);
  if (!current) throw new ApplicationError("not_found", "Prospect not found");

  const routeId = input.routeId ?? current.routeId;
  const routeModuleId = input.routeModuleId !== undefined ? input.routeModuleId : routeId === current.routeId ? current.moduleId : null;
  const routingChanged = routeId !== current.routeId || routeModuleId !== current.moduleId;

  const changes: ProspectPatch = { ...pickChangedFields(current, input, editableFields), ...(routingChanged ? { routeId, routeModuleId } : {}) };
  if (Object.keys(changes).length === 0) return { prospectId: current.id, changed: false, auditEventId: null };
  if (routingChanged) await requireRouting(routes, routeId, routeModuleId);

  const auditEventId = await commands.updateProspect(current.id, changes, toAuditEvent(actor, {
    action: "prospect.updated",
    entityType: "prospect",
    entityId: current.id,
    summary: `Updated ${Object.keys(changes).join(", ")} of a prospect`,
    metadata: toChangeMetadata({ ...current, routeModuleId: current.moduleId }, changes, redactedFields)
  }));

  return { prospectId: current.id, changed: true, auditEventId };
}
