import type { RouteRepository } from "@/modules/routes/data/route.repository";
import type { RouteIdInput, RouteModuleIdInput } from "@/modules/routes/domain/route.schema";
import type { ArchiveRouteModuleResult, ArchiveRouteResult } from "@/modules/routes/domain/route.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type RouteReads = Pick<RouteRepository, "findRoute" | "setRouteArchived">;
type ModuleReads = Pick<RouteRepository, "findModule" | "setModuleArchived">;

async function setRouteArchived(repository: RouteReads, actor: AuthenticatedActor, input: RouteIdInput, archive: boolean): Promise<ArchiveRouteResult> {
  const route = await repository.findRoute(input.routeId);
  if (!route) throw new ApplicationError("not_found", "Route not found");
  if ((route.archivedAt !== null) === archive) return { routeId: route.id, archived: archive, changed: false, auditEventId: null };

  const auditEventId = await repository.setRouteArchived(route.id, archive ? new Date() : null, toAuditEvent(actor, {
    action: archive ? "route.archived" : "route.restored",
    entityType: "route",
    entityId: route.id,
    summary: `${archive ? "Archived" : "Restored"} route "${route.name}"`,
    metadata: {}
  }));

  return { routeId: route.id, archived: archive, changed: true, auditEventId };
}

async function setModuleArchived(repository: ModuleReads, actor: AuthenticatedActor, input: RouteModuleIdInput, archive: boolean): Promise<ArchiveRouteModuleResult> {
  const routeModule = await repository.findModule(input.routeModuleId);
  if (!routeModule) throw new ApplicationError("not_found", "Module not found");
  if ((routeModule.archivedAt !== null) === archive) return { routeModuleId: routeModule.id, archived: archive, changed: false, auditEventId: null };

  const auditEventId = await repository.setModuleArchived(routeModule.id, archive ? new Date() : null, toAuditEvent(actor, {
    action: archive ? "route_module.archived" : "route_module.restored",
    entityType: "route_module",
    entityId: routeModule.id,
    summary: `${archive ? "Archived" : "Restored"} module "${routeModule.name}"`,
    metadata: { routeId: routeModule.routeId }
  }));

  return { routeModuleId: routeModule.id, archived: archive, changed: true, auditEventId };
}

/** Hides a route from pickers and lists; its prospects, messages and history stay, and it can be restored. Idempotent. */
export const archiveRoute = (repository: RouteReads, actor: AuthenticatedActor, input: RouteIdInput) => setRouteArchived(repository, actor, input, true);
export const restoreRoute = (repository: RouteReads, actor: AuthenticatedActor, input: RouteIdInput) => setRouteArchived(repository, actor, input, false);
export const archiveRouteModule = (repository: ModuleReads, actor: AuthenticatedActor, input: RouteModuleIdInput) => setModuleArchived(repository, actor, input, true);
export const restoreRouteModule = (repository: ModuleReads, actor: AuthenticatedActor, input: RouteModuleIdInput) => setModuleArchived(repository, actor, input, false);
