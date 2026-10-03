import type { RouteRepository } from "@/modules/routes/data/route.repository";
import type { RouteView } from "@/modules/routes/domain/route.types";

/** Active routes with their active modules, in one round trip pair rather than a query per route. */
export async function listRoutes(repository: Pick<RouteRepository, "listActiveRoutes" | "listActiveModules">): Promise<RouteView[]> {
  const [routes, modules] = await Promise.all([repository.listActiveRoutes(), repository.listActiveModules()]);
  const modulesByRoute = Map.groupBy(modules, (module) => module.routeId);

  return routes.map((route) => ({ ...route, modules: (modulesByRoute.get(route.id) ?? []).map(({ id, name, description }) => ({ id, name, description })) }));
}
