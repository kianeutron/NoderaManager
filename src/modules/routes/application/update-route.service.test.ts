import { describe, expect, it, vi } from "vitest";
import { updateRoute, updateRouteModule } from "@/modules/routes/application/update-route.service";
import { updateRouteInputSchema, updateRouteModuleInputSchema } from "@/modules/routes/domain/route.schema";
import { createActor } from "@/test/factories/actors";

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const moduleId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const route = { id: routeId, name: "Agency Overflow", description: null, sortOrder: 0, archivedAt: null };
const routeModule = { id: moduleId, routeId, name: "UX studios", description: null, archivedAt: null };

function routeDependencies(found: Record<string, unknown> | null = route, sameName: Record<string, unknown> | null = null) {
  return { findRoute: vi.fn().mockResolvedValue(found), findRouteByName: vi.fn().mockResolvedValue(sameName), updateRoute: vi.fn().mockResolvedValue("audit-1") };
}
function moduleDependencies(found: Record<string, unknown> | null = routeModule, parent: Record<string, unknown> | null = route, sameName: Record<string, unknown> | null = null) {
  return { findModule: vi.fn().mockResolvedValue(found), findRoute: vi.fn().mockResolvedValue(parent), findModuleByName: vi.fn().mockResolvedValue(sameName), updateModule: vi.fn().mockResolvedValue("audit-1") };
}

describe("updateRoute", () => {
  it("writes only what differs, audits before and after, and clears a description with null", async () => {
    const dependencies = routeDependencies({ ...route, description: "Old" });
    const result = await updateRoute(dependencies, createActor(), updateRouteInputSchema.parse({ routeId, name: "Agency Overflow", description: null, sortOrder: 3 }));

    expect(dependencies.updateRoute).toHaveBeenCalledWith(routeId, { description: null, sortOrder: 3 }, expect.objectContaining({ action: "route.updated", metadata: expect.objectContaining({ fields: ["description", "sortOrder"] }) }));
    expect(result).toEqual({ routeId, changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when nothing really changes", async () => {
    const dependencies = routeDependencies();
    await expect(updateRoute(dependencies, createActor(), updateRouteInputSchema.parse({ routeId, name: "Agency Overflow", sortOrder: 0 }))).resolves.toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.updateRoute).not.toHaveBeenCalled();
  });

  it("refuses a name another route has, but lets a route change the case of its own name", async () => {
    await expect(updateRoute(routeDependencies(route, { id: "other", archivedAt: null }), createActor(), updateRouteInputSchema.parse({ routeId, name: "Recruiters" }))).rejects.toMatchObject({ code: "conflict", reason: "route_name_taken" });
    const own = routeDependencies(route, { id: routeId, archivedAt: null });
    await expect(updateRoute(own, createActor(), updateRouteInputSchema.parse({ routeId, name: "agency overflow" }))).resolves.toMatchObject({ changed: true });
  });

  it("treats an unknown or archived route as not found", async () => {
    await expect(updateRoute(routeDependencies(null), createActor(), updateRouteInputSchema.parse({ routeId, name: "New" }))).rejects.toMatchObject({ code: "not_found" });
    await expect(updateRoute(routeDependencies({ ...route, archivedAt: new Date() }), createActor(), updateRouteInputSchema.parse({ routeId, name: "New" }))).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("updateRouteModule", () => {
  it("renames a module of an active route and audits it with the route id", async () => {
    const dependencies = moduleDependencies();
    await updateRouteModule(dependencies, createActor(), updateRouteModuleInputSchema.parse({ routeModuleId: moduleId, name: "Design studios" }));

    expect(dependencies.updateModule).toHaveBeenCalledWith(moduleId, { name: "Design studios" }, expect.objectContaining({ action: "route_module.updated", metadata: expect.objectContaining({ routeId }) }));
  });

  it("refuses a name another module of the same route has", async () => {
    await expect(updateRouteModule(moduleDependencies(routeModule, route, { id: "other" }), createActor(), updateRouteModuleInputSchema.parse({ routeModuleId: moduleId, name: "Taken" }))).rejects.toMatchObject({ reason: "module_name_taken" });
  });

  it("treats an unknown module, an archived module and a module of an archived route as not found", async () => {
    for (const dependencies of [moduleDependencies(null), moduleDependencies({ ...routeModule, archivedAt: new Date() }), moduleDependencies(routeModule, { ...route, archivedAt: new Date() })]) {
      await expect(updateRouteModule(dependencies, createActor(), updateRouteModuleInputSchema.parse({ routeModuleId: moduleId, name: "New" }))).rejects.toMatchObject({ code: "not_found" });
    }
  });
});
