import { hc } from "hono/client";
import type { RoutesRoutes } from "@/modules/routes/api/routes.routes";
import type { CreateRouteInput, ModuleChanges, RouteChanges, RouteModuleBody } from "@/modules/routes/domain/route.schema";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const routesClient = () => hc<RoutesRoutes>(`${window.location.origin}/api/routes`);

export async function fetchRouteCatalog() {
  const response = await routesClient().index.$get();
  if (!response.ok) throw await toApiRequestError(response);
  return (await response.json()).routes;
}

export async function fetchRouteOverview(scope: "active" | "archived") {
  const response = await routesClient().overview.$get({ query: { scope } });
  if (!response.ok) throw await toApiRequestError(response);
  return (await response.json()).routes;
}

export async function createRoute(input: CreateRouteInput) {
  const response = await routesClient().index.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function updateRoute(id: string, changes: RouteChanges) {
  const response = await routesClient()[":id"].$patch({ param: { id }, json: changes });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setRouteArchived(id: string, archive: boolean) {
  const route = routesClient()[":id"];
  const response = await (archive ? route.archive.$post({ param: { id } }) : route.restore.$post({ param: { id } }));
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function createRouteModule(routeId: string, input: RouteModuleBody) {
  const response = await routesClient()[":id"].modules.$post({ param: { id: routeId }, json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function updateRouteModule(id: string, changes: ModuleChanges) {
  const response = await routesClient().modules[":id"].$patch({ param: { id }, json: changes });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setRouteModuleArchived(id: string, archive: boolean) {
  const routeModule = routesClient().modules[":id"];
  const response = await (archive ? routeModule.archive.$post({ param: { id } }) : routeModule.restore.$post({ param: { id } }));
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}
