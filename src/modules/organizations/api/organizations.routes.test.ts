// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { organizationsRoutes } from "@/modules/organizations/api/organizations.routes";
import { getOrganizationsServices } from "@/modules/organizations/application/organizations-services";
import type { OrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import { AccessBoundaryError, requireDashboardOwner } from "@/shared/auth/access-boundary";
import { handleApiError } from "@/shared/api/api-error-handler";
import { RateLimitedError } from "@/shared/errors/application-error";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";
import { createFakeServices } from "@/test/fake-services";
import { createActor } from "@/test/factories/actors";

// Factories keep the real (server-only) modules from loading at all.
vi.mock("@/shared/auth/access-boundary", () => ({
  requireDashboardOwner: vi.fn(),
  AccessBoundaryError: class extends Error { public constructor(public readonly status: 401 | 403) { super("Access denied"); } }
}));
vi.mock("@/shared/rate-limit/rate-limiter", () => ({ getRateLimiter: vi.fn() }));
vi.mock("@/modules/organizations/application/organizations-services", () => ({ getOrganizationsServices: vi.fn() }));

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const app = new Hono().route("/organizations", organizationsRoutes).onError(handleApiError);

const enforce = vi.fn();

describe("organizations routes", () => {
  let services: ReturnType<typeof createFakeServices<OrganizationsServices>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRateLimiter).mockReturnValue({ enforce });
    vi.mocked(requireDashboardOwner).mockResolvedValue(createActor());
    services = createFakeServices<OrganizationsServices>();
    vi.mocked(getOrganizationsServices).mockReturnValue(services);
  });

  it("checks the owner before validating anything", async () => {
    vi.mocked(requireDashboardOwner).mockRejectedValue(new AccessBoundaryError(401));

    expect((await app.request("/organizations?limit=9999")).status).toBe(401);
    expect(services.searchOrganizations).not.toHaveBeenCalled();
  });

  it("searches with validated, defaulted filters and never caches", async () => {
    services.searchOrganizations.mockResolvedValue({ items: [], total: 0, nextCursor: null });
    const response = await app.request("/organizations?q=blue&organizationType=agency&sort=name");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(services.searchOrganizations).toHaveBeenCalledWith({ q: "blue", organizationType: "agency", sort: "name", limit: 25, scope: "active" });
  });

  it.each([["an oversized page", "limit=51"], ["an unknown type", "organizationType=startup"], ["a cursor for another sort", `sort=name&cursor=${encodeURIComponent("garbage")}`]])("rejects %s", async (_case, query) => {
    expect((await app.request(`/organizations?${query}`)).status).toBe(400);
    expect(services.searchOrganizations).not.toHaveBeenCalled();
  });

  it("returns one organization, 404 for an unknown id and 400 for a malformed one", async () => {
    services.getOrganization.mockResolvedValueOnce({ id, name: "Bluewave" });
    expect(await (await app.request(`/organizations/${id}`)).json()).toEqual({ id, name: "Bluewave" });

    services.getOrganization.mockResolvedValueOnce(null);
    expect((await app.request(`/organizations/${id}`)).status).toBe(404);
    expect((await app.request("/organizations/nope")).status).toBe(400);
  });

  describe("writes", () => {
    const actor = createActor();
    const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

    it("counts writes per actor and leaves reads uncounted", async () => {
      await app.request("/organizations?limit=1");
      expect(enforce).not.toHaveBeenCalled();

      await app.request("/organizations", json("POST", { name: "Bluewave" }));
      expect(enforce).toHaveBeenCalledWith(actor.id, expect.objectContaining({ name: "web-write" }));
    });

    it("stops a write over the limit before it reaches a service", async () => {
      enforce.mockRejectedValue(new RateLimitedError(30));
      await app.request("/organizations", json("POST", { name: "Bluewave" }));

      expect(services.createOrganization).not.toHaveBeenCalled();
    });

    beforeEach(() => {
      vi.mocked(requireDashboardOwner).mockResolvedValue(actor);
    });

    it("creates an organization as the verified actor and answers 201", async () => {
      services.createOrganization.mockResolvedValue({ organizationId: id, created: true, auditEventId: "a1", similarOrganizations: [] });
      const response = await app.request("/organizations", json("POST", { name: "Bluewave", domains: ["Bluewave.io"] }));

      expect(response.status).toBe(201);
      expect(services.createOrganization).toHaveBeenCalledWith(actor, expect.objectContaining({ name: "Bluewave", organizationType: "company", domains: ["bluewave.io"] }));
    });

    it("rejects unknown fields and empty updates", async () => {
      expect((await app.request("/organizations", json("POST", { name: "Bluewave", admin: true }))).status).toBe(400);
      expect((await app.request(`/organizations/${id}`, json("PATCH", {}))).status).toBe(400);
      expect(services.updateOrganization).not.toHaveBeenCalled();
    });

    it("archives and restores by path id", async () => {
      services.archiveOrganization.mockResolvedValue({ organizationId: id, archived: true, changed: true, auditEventId: "a1" });
      expect((await app.request(`/organizations/${id}/archive`, { method: "POST" })).status).toBe(200);
      expect(services.archiveOrganization).toHaveBeenCalledWith(actor, { organizationId: id });

      services.restoreOrganization.mockResolvedValue({ organizationId: id, archived: false, changed: true, auditEventId: "a2" });
      await app.request(`/organizations/${id}/restore`, { method: "POST" });
      expect(services.restoreOrganization).toHaveBeenCalledWith(actor, { organizationId: id });
    });

    it("checks for similar names before a company is created", async () => {
      services.findSimilarOrganizations.mockResolvedValue([{ organizationId: id, name: "Bluewave" }]);
      const response = await app.request("/organizations/similar-check", json("POST", { name: "Bluewave" }));

      expect(await response.json()).toEqual({ data: { similar: [{ organizationId: id, name: "Bluewave" }] } });
      expect((await app.request("/organizations/similar-check", json("POST", {}))).status).toBe(400);
    });

    it("takes the id from the path and replaces domains", async () => {
      services.updateOrganization.mockResolvedValue({ organizationId: id, changed: true, auditEventId: "a1" });
      await app.request(`/organizations/${id}`, json("PATCH", { industry: null }));
      expect(services.updateOrganization).toHaveBeenCalledWith(actor, { organizationId: id, industry: null });

      services.setOrganizationDomains.mockResolvedValue({ organizationId: id, domains: ["bluewave.io"], changed: true, auditEventId: "a2" });
      await app.request(`/organizations/${id}/domains`, json("PUT", { domains: ["bluewave.io"] }));
      expect(services.setOrganizationDomains).toHaveBeenCalledWith(actor, { organizationId: id, domains: ["bluewave.io"] });
    });
  });
});
