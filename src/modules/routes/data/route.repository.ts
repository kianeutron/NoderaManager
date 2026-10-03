import { and, asc, count, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import type { RecordScope } from "@/shared/api/field-schemas";
import { closedProspectStatuses } from "@/modules/prospects/domain/prospect-status";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { prospects, routeModules, routes } from "@/shared/db/schema/core";
import { outreachMessages } from "@/shared/db/schema/engagement";

type RoutesDatabase = ReturnType<typeof getDatabase>;

export type NewRouteDraft = Readonly<{ routeId: string; name: string; description: string | null; sortOrder: number; audit: AuditEventInput }>;
export type NewRouteModuleDraft = Readonly<{ routeModuleId: string; routeId: string; name: string; description: string | null; audit: AuditEventInput }>;

export type RoutePatch = Readonly<{ name?: string; description?: string | null; sortOrder?: number }>;
export type ModulePatch = Readonly<{ name?: string; description?: string | null }>;

/** Counts for one (route, module) pair; a null module means "filed under the route itself". */
export type StatRow = Readonly<{ routeId: string; routeModuleId: string | null; prospects: number; openProspects: number; won: number }>;
export type MessageStatRow = Readonly<{ routeId: string | null; routeModuleId: string | null; messages: number; replies: number }>;

export function createRouteRepository(database: RoutesDatabase) {
  return {
    listActiveRoutes: () =>
      database.select({ id: routes.id, name: routes.name, description: routes.description }).from(routes)
        .where(isNull(routes.archivedAt))
        .orderBy(asc(routes.sortOrder), asc(sql`lower(${routes.name})`), asc(routes.id)),

    listActiveModules: () =>
      database.select({ id: routeModules.id, routeId: routeModules.routeId, name: routeModules.name, description: routeModules.description }).from(routeModules)
        .where(isNull(routeModules.archivedAt))
        .orderBy(asc(sql`lower(${routeModules.name})`), asc(routeModules.id)),

    findRoute: async (routeId: string) => {
      const [row] = await database.select({ id: routes.id, name: routes.name, description: routes.description, sortOrder: routes.sortOrder, archivedAt: routes.archivedAt }).from(routes).where(eq(routes.id, routeId)).limit(1);
      return row ?? null;
    },

    /** Names are unique regardless of case and of archival, so this also finds an archived route. */
    findRouteByName: async (name: string) => {
      const [row] = await database.select({ id: routes.id, archivedAt: routes.archivedAt }).from(routes).where(sql`lower(${routes.name}) = lower(${name})`).limit(1);
      return row ?? null;
    },

    findModule: async (routeModuleId: string) => {
      const [row] = await database.select({ id: routeModules.id, routeId: routeModules.routeId, name: routeModules.name, description: routeModules.description, archivedAt: routeModules.archivedAt }).from(routeModules).where(eq(routeModules.id, routeModuleId)).limit(1);
      return row ?? null;
    },

    findModuleByName: async (routeId: string, name: string) => {
      const [row] = await database.select({ id: routeModules.id, archivedAt: routeModules.archivedAt }).from(routeModules)
        .where(and(eq(routeModules.routeId, routeId), sql`lower(${routeModules.name}) = lower(${name})`))
        .limit(1);
      return row ?? null;
    },

    /** Routes in the order the owner set, active ones or archived ones. */
    listRoutesByScope: (scope: RecordScope) =>
      database.select({ id: routes.id, name: routes.name, description: routes.description, sortOrder: routes.sortOrder, archivedAt: routes.archivedAt }).from(routes)
        .where(scope === "archived" ? isNotNull(routes.archivedAt) : isNull(routes.archivedAt))
        .orderBy(asc(routes.sortOrder), asc(sql`lower(${routes.name})`), asc(routes.id)),

    /** Every module, archived ones included, so a route's page can show and restore them. */
    listAllModules: () =>
      database.select({ id: routeModules.id, routeId: routeModules.routeId, name: routeModules.name, description: routeModules.description, archivedAt: routeModules.archivedAt }).from(routeModules)
        .orderBy(asc(sql`lower(${routeModules.name})`), asc(routeModules.id)),

    /** Prospects per route and module. Archived prospects are not counted. */
    countProspectsByRoute: (): Promise<StatRow[]> =>
      database.select({
        routeId: prospects.routeId, routeModuleId: prospects.routeModuleId, prospects: count(),
        openProspects: sql<number>`count(*) filter (where ${notInArray(prospects.status, [...closedProspectStatuses])})::int`,
        won: sql<number>`count(*) filter (where ${eq(prospects.status, "won")})::int`
      }).from(prospects).where(isNull(prospects.archivedAt)).groupBy(prospects.routeId, prospects.routeModuleId),

    /** Messages per route and module, as filed when they were sent. */
    countMessagesByRoute: (): Promise<MessageStatRow[]> =>
      database.select({
        routeId: outreachMessages.routeId, routeModuleId: outreachMessages.routeModuleId, messages: count(),
        replies: sql<number>`count(*) filter (where ${eq(outreachMessages.replyStatus, "replied")})::int`
      }).from(outreachMessages).groupBy(outreachMessages.routeId, outreachMessages.routeModuleId),

    updateRoute: async (routeId: string, patch: RoutePatch, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(routes).set({ ...patch, updatedAt: new Date() }).where(eq(routes.id, routeId)), audit.statement]);
      return audit.id;
    },

    updateModule: async (routeModuleId: string, patch: ModulePatch, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(routeModules).set({ ...patch, updatedAt: new Date() }).where(eq(routeModules.id, routeModuleId)), audit.statement]);
      return audit.id;
    },

    /** `null` restores. Only hides the route from pickers and lists: its prospects, messages and history stay. */
    setRouteArchived: async (routeId: string, archivedAt: Date | null, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(routes).set({ archivedAt, updatedAt: new Date() }).where(eq(routes.id, routeId)), audit.statement]);
      return audit.id;
    },

    setModuleArchived: async (routeModuleId: string, archivedAt: Date | null, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(routeModules).set({ archivedAt, updatedAt: new Date() }).where(eq(routeModules.id, routeModuleId)), audit.statement]);
      return audit.id;
    },

    insertRoute: async ({ audit: auditInput, routeId, ...values }: NewRouteDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.insert(routes).values({ id: routeId, ...values }), audit.statement]);
      return audit.id;
    },

    insertRouteModule: async ({ audit: auditInput, routeModuleId, ...values }: NewRouteModuleDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.insert(routeModules).values({ id: routeModuleId, ...values }), audit.statement]);
      return audit.id;
    }
  };
}

export type RouteRepository = ReturnType<typeof createRouteRepository>;
