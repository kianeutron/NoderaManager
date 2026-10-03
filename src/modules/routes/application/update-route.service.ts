import type { RouteRepository } from "@/modules/routes/data/route.repository";
import type { UpdateRouteInput, UpdateRouteModuleInput } from "@/modules/routes/domain/route.schema";
import type { UpdateRouteModuleResult, UpdateRouteResult } from "@/modules/routes/domain/route.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import { toChangeMetadata } from "@/shared/audit/change-metadata";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { pickChangedFields } from "@/shared/lib/changed-fields";

const routeFields = ["name", "description", "sortOrder"] as const;
const moduleFields = ["name", "description"] as const;

/** Renames, describes or re-orders an active route. Only real differences are written and audited. A name another route has is refused, ignoring case. */
export async function updateRoute(repository: Pick<RouteRepository, "findRoute" | "findRouteByName" | "updateRoute">, actor: AuthenticatedActor, input: UpdateRouteInput): Promise<UpdateRouteResult> {
  const current = await repository.findRoute(input.routeId);
  if (!current || current.archivedAt !== null) throw new ApplicationError("not_found", "Route not found");

  const changes = pickChangedFields(current, input, routeFields);
  if (Object.keys(changes).length === 0) return { routeId: current.id, changed: false, auditEventId: null };

  if (changes.name !== undefined) {
    const taken = await repository.findRouteByName(changes.name);
    if (taken && taken.id !== current.id) throw new ApplicationError("conflict", `A route named "${changes.name}" already exists.`, "route_name_taken");
  }

  const auditEventId = await repository.updateRoute(current.id, changes, toAuditEvent(actor, {
    action: "route.updated",
    entityType: "route",
    entityId: current.id,
    summary: `Updated ${Object.keys(changes).join(", ")} of route "${current.name}"`,
    metadata: toChangeMetadata(current, changes)
  }));

  return { routeId: current.id, changed: true, auditEventId };
}

/** The same for a module of an active route; module names are unique within their route. */
export async function updateRouteModule(repository: Pick<RouteRepository, "findModule" | "findRoute" | "findModuleByName" | "updateModule">, actor: AuthenticatedActor, input: UpdateRouteModuleInput): Promise<UpdateRouteModuleResult> {
  const current = await repository.findModule(input.routeModuleId);
  const route = current ? await repository.findRoute(current.routeId) : null;
  if (!current || current.archivedAt !== null || !route || route.archivedAt !== null) throw new ApplicationError("not_found", "Module not found");

  const changes = pickChangedFields(current, input, moduleFields);
  if (Object.keys(changes).length === 0) return { routeModuleId: current.id, changed: false, auditEventId: null };

  if (changes.name !== undefined) {
    const taken = await repository.findModuleByName(current.routeId, changes.name);
    if (taken && taken.id !== current.id) throw new ApplicationError("conflict", `A module named "${changes.name}" already exists in this route.`, "module_name_taken");
  }

  const auditEventId = await repository.updateModule(current.id, changes, toAuditEvent(actor, {
    action: "route_module.updated",
    entityType: "route_module",
    entityId: current.id,
    summary: `Updated ${Object.keys(changes).join(", ")} of module "${current.name}"`,
    metadata: { routeId: current.routeId, ...toChangeMetadata(current, changes) }
  }));

  return { routeModuleId: current.id, changed: true, auditEventId };
}
