export type RouteModuleView = Readonly<{ id: string; name: string; description: string | null }>;
export type RouteView = Readonly<{ id: string; name: string; description: string | null; modules: readonly RouteModuleView[] }>;

type Audited = Readonly<{ auditEventId: string | null }>;

export type CreateRouteResult = Audited & Readonly<{ routeId: string; created: boolean }>;
export type CreateRouteModuleResult = Audited & Readonly<{ routeId: string; routeModuleId: string; created: boolean }>;
export type UpdateRouteResult = Audited & Readonly<{ routeId: string; changed: boolean }>;
export type UpdateRouteModuleResult = Audited & Readonly<{ routeModuleId: string; changed: boolean }>;
export type ArchiveRouteResult = Audited & Readonly<{ routeId: string; archived: boolean; changed: boolean }>;
export type ArchiveRouteModuleResult = Audited & Readonly<{ routeModuleId: string; archived: boolean; changed: boolean }>;

/** What a route (or one of its modules) has produced so far, counted live. A reply means a real one, not an auto-reply. */
export type RouteStats = Readonly<{ prospects: number; openProspects: number; won: number; messages: number; replies: number }>;

export type RouteModuleOverview = Readonly<{ id: string; name: string; description: string | null; archivedAt: string | null; stats: RouteStats }>;

export type RouteOverview = Readonly<{
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  archivedAt: string | null;
  /** Everything filed under the route, including prospects and messages that name no module. */
  stats: RouteStats;
  modules: readonly RouteModuleOverview[];
}>;

