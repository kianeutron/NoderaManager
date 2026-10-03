import type { RouteRepository } from "@/modules/routes/data/route.repository";
import type { RouteOverviewQuery } from "@/modules/routes/domain/route.schema";
import type { RouteOverview } from "@/modules/routes/domain/route.types";
import { buildRouteOverview } from "@/modules/routes/application/route-overview";

type OverviewRepository = Pick<RouteRepository, "listRoutesByScope" | "listAllModules" | "countProspectsByRoute" | "countMessagesByRoute">;

/** Every route (active or archived) with its modules and what each has produced, in four reads. */
export async function getRouteOverview(repository: OverviewRepository, { scope }: RouteOverviewQuery): Promise<RouteOverview[]> {
  const [routes, modules, prospectRows, messageRows] = await Promise.all([repository.listRoutesByScope(scope), repository.listAllModules(), repository.countProspectsByRoute(), repository.countMessagesByRoute()]);
  return buildRouteOverview(routes, modules, { prospectRows, messageRows });
}
