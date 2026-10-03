import type { MessageStatRow, RouteRepository, StatRow } from "@/modules/routes/data/route.repository";
import type { RouteModuleOverview, RouteOverview, RouteStats } from "@/modules/routes/domain/route.types";

type RouteRow = Awaited<ReturnType<RouteRepository["listRoutesByScope"]>>[number];
type ModuleRow = Awaited<ReturnType<RouteRepository["listAllModules"]>>[number];

const emptyStats: RouteStats = { prospects: 0, openProspects: 0, won: 0, messages: 0, replies: 0 };
const add = (left: RouteStats, right: RouteStats): RouteStats => ({ prospects: left.prospects + right.prospects, openProspects: left.openProspects + right.openProspects, won: left.won + right.won, messages: left.messages + right.messages, replies: left.replies + right.replies });

type Counts = Readonly<{ prospectRows: readonly StatRow[]; messageRows: readonly MessageStatRow[] }>;

/** One entry per (route, module) pair, where a missing module means "filed under the route itself". */
function statsByPair({ prospectRows, messageRows }: Counts): Map<string, RouteStats> {
  const pairs = new Map<string, RouteStats>();
  const key = (routeId: string, moduleId: string | null) => `${routeId}:${moduleId ?? ""}`;
  for (const row of prospectRows) pairs.set(key(row.routeId, row.routeModuleId), add(pairs.get(key(row.routeId, row.routeModuleId)) ?? emptyStats, { ...emptyStats, prospects: row.prospects, openProspects: row.openProspects, won: row.won }));
  // A message filed before routes existed, or one whose route was never set, belongs to no route.
  for (const row of messageRows) if (row.routeId) pairs.set(key(row.routeId, row.routeModuleId), add(pairs.get(key(row.routeId, row.routeModuleId)) ?? emptyStats, { ...emptyStats, messages: row.messages, replies: row.replies }));
  return pairs;
}

/** Puts the routes, their modules and live counts together. A route's own counts include every module and the prospects that name no module. */
export function buildRouteOverview(routes: readonly RouteRow[], modules: readonly ModuleRow[], counts: Counts): RouteOverview[] {
  const pairs = statsByPair(counts);
  const modulesByRoute = Map.groupBy(modules, (routeModule) => routeModule.routeId);

  return routes.map((route) => {
    const routeModules = modulesByRoute.get(route.id) ?? [];
    const routeStats = [...pairs].filter(([pair]) => pair.startsWith(`${route.id}:`)).reduce((total, [, stats]) => add(total, stats), emptyStats);
    const moduleViews: RouteModuleOverview[] = routeModules.map((routeModule) => ({
      id: routeModule.id, name: routeModule.name, description: routeModule.description, archivedAt: routeModule.archivedAt?.toISOString() ?? null, stats: pairs.get(`${route.id}:${routeModule.id}`) ?? emptyStats
    }));
    return { id: route.id, name: route.name, description: route.description, sortOrder: route.sortOrder, archivedAt: route.archivedAt?.toISOString() ?? null, stats: routeStats, modules: moduleViews };
  });
}
