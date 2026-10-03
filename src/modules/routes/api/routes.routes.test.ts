// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleApiError } from "@/shared/api/api-error-handler";
import { requireDashboardOwner } from "@/shared/auth/access-boundary";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";
import { routesRoutes } from "@/modules/routes/api/routes.routes";
import { getRoutesServices } from "@/modules/routes/application/routes-services";
import type { RoutesServices } from "@/modules/routes/application/create-routes-services";
import { createFakeServices } from "@/test/fake-services";
import { createActor } from "@/test/factories/actors";

vi.mock("@/shared/auth/access-boundary", () => ({
  requireDashboardOwner: vi.fn(),
  AccessBoundaryError: class extends Error { public constructor(public readonly status: 401 | 403) { super("Access denied"); } }
}));
vi.mock("@/shared/rate-limit/rate-limiter", () => ({ getRateLimiter: vi.fn() }));

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const actor = createActor();
const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

vi.mock("@/modules/routes/application/routes-services", () => ({ getRoutesServices: vi.fn() }));

const app = new Hono().route("/routes", routesRoutes).onError(handleApiError);

describe("routes routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRateLimiter).mockReturnValue({ enforce: vi.fn() });
    vi.mocked(requireDashboardOwner).mockResolvedValue(actor);
  });

  it("lists routes with their modules, uncached", async () => {
    const services = createFakeServices<RoutesServices>();
    services.listRoutes.mockResolvedValue([{ id, name: "Agencies", description: null, modules: [] }]);
    vi.mocked(getRoutesServices).mockReturnValue(services);
    const response = await app.request("/routes");

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ routes: [{ id, name: "Agencies", description: null, modules: [] }] });
  });

  describe("managing routes", () => {
    const moduleId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d99";

    it("serves the overview for a scope, uncached, and rejects an unknown one", async () => {
      const services = createFakeServices<RoutesServices>();
      services.getRouteOverview.mockResolvedValue([]);
      vi.mocked(getRoutesServices).mockReturnValue(services);

      expect((await app.request("/routes/overview?scope=archived")).headers.get("cache-control")).toBe("no-store");
      expect(services.getRouteOverview).toHaveBeenCalledWith({ scope: "archived" });
      expect((await app.request("/routes/overview?scope=all")).status).toBe(400);
    });

    it("creates a route as the verified actor: 201, or 200 when it already existed", async () => {
      const services = createFakeServices<RoutesServices>();
      vi.mocked(getRoutesServices).mockReturnValue(services);
      services.createRoute.mockResolvedValueOnce({ routeId: id, created: true, auditEventId: "a1" });
      expect((await app.request("/routes", json("POST", { name: "Recruiters" }))).status).toBe(201);
      expect(services.createRoute).toHaveBeenCalledWith(actor, { name: "Recruiters", sortOrder: 0 });

      services.createRoute.mockResolvedValueOnce({ routeId: id, created: false, auditEventId: null });
      expect((await app.request("/routes", json("POST", { name: "Recruiters" }))).status).toBe(200);
    });

    it("takes ids from the path for edits and archiving, for routes and for modules", async () => {
      const services = createFakeServices<RoutesServices>();
      vi.mocked(getRoutesServices).mockReturnValue(services);
      services.updateRoute.mockResolvedValue({ routeId: id, changed: true, auditEventId: "a1" });
      await app.request(`/routes/${id}`, json("PATCH", { description: null }));
      expect(services.updateRoute).toHaveBeenCalledWith(actor, { routeId: id, description: null });
      expect((await app.request(`/routes/${id}`, json("PATCH", {}))).status).toBe(400);

      services.updateRouteModule.mockResolvedValue({ routeModuleId: moduleId, changed: true, auditEventId: "a2" });
      await app.request(`/routes/modules/${moduleId}`, json("PATCH", { name: "Design studios" }));
      expect(services.updateRouteModule).toHaveBeenCalledWith(actor, { routeModuleId: moduleId, name: "Design studios" });

      services.archiveRoute.mockResolvedValue({ routeId: id, archived: true, changed: true, auditEventId: "a3" });
      await app.request(`/routes/${id}/archive`, { method: "POST" });
      expect(services.archiveRoute).toHaveBeenCalledWith(actor, { routeId: id });
      services.restoreRouteModule.mockResolvedValue({ routeModuleId: moduleId, archived: false, changed: true, auditEventId: "a4" });
      await app.request(`/routes/modules/${moduleId}/restore`, { method: "POST" });
      expect(services.restoreRouteModule).toHaveBeenCalledWith(actor, { routeModuleId: moduleId });
    });

    it("creates a module under the route in the path, never one named in the body", async () => {
      const services = createFakeServices<RoutesServices>();
      vi.mocked(getRoutesServices).mockReturnValue(services);
      services.createRouteModule.mockResolvedValue({ routeId: id, routeModuleId: moduleId, created: true, auditEventId: "a1" });

      expect((await app.request(`/routes/${id}/modules`, json("POST", { name: "UX studios" }))).status).toBe(201);
      expect(services.createRouteModule).toHaveBeenCalledWith(actor, { name: "UX studios", routeId: id });
      expect((await app.request(`/routes/${id}/modules`, json("POST", { name: "x", routeId: moduleId }))).status).toBe(400);
    });
  });
});

