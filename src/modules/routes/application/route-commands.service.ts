import { v7 as uuidv7 } from "uuid";
import type { RouteRepository } from "@/modules/routes/data/route.repository";
import type { CreateRouteInput, CreateRouteModuleInput } from "@/modules/routes/domain/route.schema";
import type { CreateRouteModuleResult, CreateRouteResult } from "@/modules/routes/domain/route.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

/** Idempotent: a route with the same name (case-insensitive) is returned unchanged. */
export async function createRoute(repository: Pick<RouteRepository, "findRouteByName" | "insertRoute">, actor: AuthenticatedActor, input: CreateRouteInput): Promise<CreateRouteResult> {
  const existing = await repository.findRouteByName(input.name);
  if (existing) {
    if (existing.archivedAt !== null) throw new ApplicationError("conflict", `A route named "${input.name}" exists but is archived`);
    return { routeId: existing.id, created: false, auditEventId: null };
  }

  const routeId = uuidv7();
  const auditEventId = await repository.insertRoute({
    routeId,
    name: input.name,
    description: input.description ?? null,
    sortOrder: input.sortOrder,
    audit: toAuditEvent(actor, { action: "route.created", entityType: "route", entityId: routeId, summary: `Created route "${input.name}"`, metadata: { sortOrder: input.sortOrder } })
  });

  return { routeId, created: true, auditEventId };
}

/** Idempotent: a module with the same name (case-insensitive) in the same route is returned unchanged. */
export async function createRouteModule(repository: Pick<RouteRepository, "findRoute" | "findModuleByName" | "insertRouteModule">, actor: AuthenticatedActor, input: CreateRouteModuleInput): Promise<CreateRouteModuleResult> {
  const route = await repository.findRoute(input.routeId);
  if (!route || route.archivedAt !== null) throw new ApplicationError("not_found", "Route not found");

  const existing = await repository.findModuleByName(route.id, input.name);
  if (existing) {
    if (existing.archivedAt !== null) throw new ApplicationError("conflict", `A module named "${input.name}" exists in this route but is archived`);
    return { routeId: route.id, routeModuleId: existing.id, created: false, auditEventId: null };
  }

  const routeModuleId = uuidv7();
  const auditEventId = await repository.insertRouteModule({
    routeModuleId,
    routeId: route.id,
    name: input.name,
    description: input.description ?? null,
    audit: toAuditEvent(actor, { action: "route_module.created", entityType: "route_module", entityId: routeModuleId, summary: `Created module "${input.name}" in route "${route.name}"`, metadata: { routeId: route.id } })
  });

  return { routeId: route.id, routeModuleId, created: true, auditEventId };
}
