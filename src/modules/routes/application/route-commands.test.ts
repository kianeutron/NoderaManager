import { describe, expect, it, vi } from "vitest";
import { listRoutes } from "@/modules/routes/application/list-routes.service";
import { createRoute, createRouteModule } from "@/modules/routes/application/route-commands.service";
import { createRouteInputSchema, createRouteModuleInputSchema } from "@/modules/routes/domain/route.schema";
import { createActor } from "@/test/factories/actors";

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("listRoutes", () => {
  it("groups active modules under their route without a query per route", async () => {
    const repository = {
      listActiveRoutes: vi.fn().mockResolvedValue([{ id: "r1", name: "Agency overflow", description: null }, { id: "r2", name: "Recruiters", description: "Talent partners" }]),
      listActiveModules: vi.fn().mockResolvedValue([{ id: "m1", routeId: "r1", name: "UX studios", description: null }, { id: "m2", routeId: "r1", name: "Security", description: "x" }])
    };

    expect(await listRoutes(repository)).toEqual([
      { id: "r1", name: "Agency overflow", description: null, modules: [{ id: "m1", name: "UX studios", description: null }, { id: "m2", name: "Security", description: "x" }] },
      { id: "r2", name: "Recruiters", description: "Talent partners", modules: [] }
    ]);
  });
});

describe("createRoute", () => {
  const repository = (existing: unknown = null) => ({ findRouteByName: vi.fn().mockResolvedValue(existing), insertRoute: vi.fn().mockResolvedValue("audit-1") });
  const input = createRouteInputSchema.parse({ name: "  Agency   Overflow " });

  it("creates a route and audits it", async () => {
    const deps = repository();
    const result = await createRoute(deps, createActor(), input);

    expect(deps.insertRoute).toHaveBeenCalledWith(expect.objectContaining({ name: "Agency Overflow", sortOrder: 0, audit: expect.objectContaining({ action: "route.created" }) }));
    expect(result).toMatchObject({ created: true, auditEventId: "audit-1" });
  });

  it("is idempotent for an existing name, and refuses to reuse an archived one", async () => {
    const existing = repository({ id: routeId, archivedAt: null });
    expect(await createRoute(existing, createActor(), input)).toEqual({ routeId, created: false, auditEventId: null });
    expect(existing.insertRoute).not.toHaveBeenCalled();

    await expect(createRoute(repository({ id: routeId, archivedAt: new Date() }), createActor(), input)).rejects.toThrow("exists but is archived");
  });
});

describe("createRouteModule", () => {
  const repository = (overrides: { route?: unknown; module?: unknown } = {}) => ({
    findRoute: vi.fn().mockResolvedValue("route" in overrides ? overrides.route : { id: routeId, name: "Referral partners", archivedAt: null }),
    findModuleByName: vi.fn().mockResolvedValue(overrides.module ?? null),
    insertRouteModule: vi.fn().mockResolvedValue("audit-1")
  });
  const input = createRouteModuleInputSchema.parse({ routeId, name: "UX studios" });

  it("creates a module inside an active route", async () => {
    const deps = repository();
    const result = await createRouteModule(deps, createActor(), input);

    expect(deps.insertRouteModule).toHaveBeenCalledWith(expect.objectContaining({ routeId, name: "UX studios", audit: expect.objectContaining({ action: "route_module.created" }) }));
    expect(result).toMatchObject({ routeId, created: true });
  });

  it("is idempotent for an existing module name in the route", async () => {
    const deps = repository({ module: { id: "m1", archivedAt: null } });

    expect(await createRouteModule(deps, createActor(), input)).toEqual({ routeId, routeModuleId: "m1", created: false, auditEventId: null });
  });

  it("refuses an unknown or archived route", async () => {
    await expect(createRouteModule(repository({ route: null }), createActor(), input)).rejects.toMatchObject({ code: "not_found" });
    await expect(createRouteModule(repository({ route: { id: routeId, name: "x", archivedAt: new Date() } }), createActor(), input)).rejects.toMatchObject({ code: "not_found" });
  });
});
