import { getRouteOverview } from "@/modules/routes/application/get-route-overview.service";
import { archiveRoute, archiveRouteModule, restoreRoute, restoreRouteModule } from "@/modules/routes/application/set-route-archived.service";
import { updateRoute, updateRouteModule } from "@/modules/routes/application/update-route.service";
import { listRoutes } from "@/modules/routes/application/list-routes.service";
import { createRoute, createRouteModule } from "@/modules/routes/application/route-commands.service";
import { createRouteRepository } from "@/modules/routes/data/route.repository";
import type { CreateRouteInput, CreateRouteModuleInput, RouteIdInput, RouteModuleIdInput, RouteOverviewQuery, UpdateRouteInput, UpdateRouteModuleInput } from "@/modules/routes/domain/route.schema";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { getDatabase } from "@/shared/db/client";

/** Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createRoutesServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const routes = createRouteRepository(database);

  return {
    listRoutes: () => listRoutes(routes),
    getRouteOverview: (query: RouteOverviewQuery) => getRouteOverview(routes, query),
    updateRoute: (actor: AuthenticatedActor, input: UpdateRouteInput) => updateRoute(routes, actor, input),
    updateRouteModule: (actor: AuthenticatedActor, input: UpdateRouteModuleInput) => updateRouteModule(routes, actor, input),
    archiveRoute: (actor: AuthenticatedActor, input: RouteIdInput) => archiveRoute(routes, actor, input),
    restoreRoute: (actor: AuthenticatedActor, input: RouteIdInput) => restoreRoute(routes, actor, input),
    archiveRouteModule: (actor: AuthenticatedActor, input: RouteModuleIdInput) => archiveRouteModule(routes, actor, input),
    restoreRouteModule: (actor: AuthenticatedActor, input: RouteModuleIdInput) => restoreRouteModule(routes, actor, input),
    createRoute: (actor: AuthenticatedActor, input: CreateRouteInput) => createRoute(routes, actor, input),
    createRouteModule: (actor: AuthenticatedActor, input: CreateRouteModuleInput) => createRouteModule(routes, actor, input)
  };
}

export type RoutesServices = ReturnType<typeof createRoutesServices>;
