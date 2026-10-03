import type { RouteRepository } from "@/modules/routes/data/route.repository";
import { ApplicationError } from "@/shared/errors/application-error";

/** A prospect's route must be active, and its module (if any) must be active and belong to that route. */
export async function requireRouting(routes: Pick<RouteRepository, "findRoute" | "findModule">, routeId: string, routeModuleId: string | null): Promise<void> {
  const route = await routes.findRoute(routeId);
  if (!route || route.archivedAt !== null) throw new ApplicationError("not_found", "Route not found. Use list_routes to find route ids.", "route_not_found");
  if (routeModuleId === null) return;

  const routeModule = await routes.findModule(routeModuleId);
  if (!routeModule || routeModule.archivedAt !== null || routeModule.routeId !== routeId) throw new ApplicationError("not_found", "That module does not exist in this route. Use list_routes to find module ids.", "module_not_in_route");
}
