import { describe, expect, it, vi } from "vitest";
import { archiveRoute, archiveRouteModule, restoreRoute, restoreRouteModule } from "@/modules/routes/application/set-route-archived.service";
import { createActor } from "@/test/factories/actors";

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const moduleId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const archivedAt = new Date("2026-09-01T00:00:00Z");

const routes = (found: Record<string, unknown> | null) => ({ findRoute: vi.fn().mockResolvedValue(found), setRouteArchived: vi.fn().mockResolvedValue("audit-1") });
const modules = (found: Record<string, unknown> | null) => ({ findModule: vi.fn().mockResolvedValue(found), setModuleArchived: vi.fn().mockResolvedValue("audit-1") });

describe("route archiving", () => {
  it("archives a live route and restores an archived one, each audited", async () => {
    const archiving = routes({ id: routeId, name: "Agency Overflow", archivedAt: null });
    expect(await archiveRoute(archiving, createActor(), { routeId })).toEqual({ routeId, archived: true, changed: true, auditEventId: "audit-1" });
    expect(archiving.setRouteArchived).toHaveBeenCalledWith(routeId, expect.any(Date), expect.objectContaining({ action: "route.archived" }));

    const restoring = routes({ id: routeId, name: "Agency Overflow", archivedAt });
    await restoreRoute(restoring, createActor(), { routeId });
    expect(restoring.setRouteArchived).toHaveBeenCalledWith(routeId, null, expect.objectContaining({ action: "route.restored" }));
  });

  it("is a no-op in the state it is already in, and reports an unknown route", async () => {
    const already = routes({ id: routeId, name: "x", archivedAt });
    await expect(archiveRoute(already, createActor(), { routeId })).resolves.toMatchObject({ changed: false, auditEventId: null });
    expect(already.setRouteArchived).not.toHaveBeenCalled();
    await expect(restoreRoute(routes({ id: routeId, name: "x", archivedAt: null }), createActor(), { routeId })).resolves.toMatchObject({ changed: false });
    await expect(archiveRoute(routes(null), createActor(), { routeId })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("module archiving", () => {
  it("archives and restores a module, with the route id in the audit trail", async () => {
    const archiving = modules({ id: moduleId, routeId, name: "UX studios", archivedAt: null });
    await archiveRouteModule(archiving, createActor(), { routeModuleId: moduleId });
    expect(archiving.setModuleArchived).toHaveBeenCalledWith(moduleId, expect.any(Date), expect.objectContaining({ action: "route_module.archived", metadata: { routeId } }));

    const restoring = modules({ id: moduleId, routeId, name: "UX studios", archivedAt });
    await expect(restoreRouteModule(restoring, createActor(), { routeModuleId: moduleId })).resolves.toMatchObject({ archived: false, changed: true });
  });

  it("is a no-op when already in that state, and reports an unknown module", async () => {
    await expect(archiveRouteModule(modules({ id: moduleId, routeId, name: "x", archivedAt }), createActor(), { routeModuleId: moduleId })).resolves.toMatchObject({ changed: false });
    await expect(archiveRouteModule(modules(null), createActor(), { routeModuleId: moduleId })).rejects.toMatchObject({ code: "not_found" });
  });
});
