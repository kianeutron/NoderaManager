// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleApiError } from "@/shared/api/api-error-handler";
import { requireDashboardOwner } from "@/shared/auth/access-boundary";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";
import { prospectsRoutes } from "@/modules/prospects/api/prospects.routes";
import { getProspectsServices } from "@/modules/prospects/application/prospects-services";
import type { ProspectsServices } from "@/modules/prospects/application/create-prospects-services";
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

vi.mock("@/modules/prospects/application/prospects-services", () => ({ getProspectsServices: vi.fn() }));

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const app = new Hono().route("/prospects", prospectsRoutes).onError(handleApiError);

describe("prospects routes", () => {
  let services: ReturnType<typeof createFakeServices<ProspectsServices>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRateLimiter).mockReturnValue({ enforce: vi.fn() });
    vi.mocked(requireDashboardOwner).mockResolvedValue(actor);
    services = createFakeServices<ProspectsServices>();
    vi.mocked(getProspectsServices).mockReturnValue(services);
  });

  it("returns one prospect and 404 for an unknown id", async () => {
    services.getProspect.mockResolvedValueOnce({ id });
    expect(await (await app.request(`/prospects/${id}`)).json()).toEqual({ id });

    services.getProspect.mockResolvedValueOnce(null);
    const missing = await app.request(`/prospects/${id}`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ code: "NOT_FOUND" });
  });

  it("creates a prospect for a person and answers 201", async () => {
    services.createProspect.mockResolvedValue({ prospectId: id, created: true, auditEventId: "a1" });
    const response = await app.request("/prospects", json("POST", { personId: id, routeId }));

    expect(response.status).toBe(201);
    expect(services.createProspect).toHaveBeenCalledWith(actor, expect.objectContaining({ personId: id, routeId, status: "researched" }));
    expect((await app.request("/prospects", json("POST", { routeId }))).status).toBe(400);
  });

  it("takes the prospect id from the path for edits and status changes", async () => {
    services.updateProspect.mockResolvedValue({ prospectId: id, changed: true, auditEventId: "a1" });
    await app.request(`/prospects/${id}`, json("PATCH", { nextAction: null }));
    expect(services.updateProspect).toHaveBeenCalledWith(actor, { prospectId: id, nextAction: null });
    expect((await app.request(`/prospects/${id}`, json("PATCH", {}))).status).toBe(400);

    services.updateProspectStatus.mockResolvedValue({ prospectId: id, status: "disqualified", previousStatus: "ready", changed: true, auditEventId: "a2" });
    await app.request(`/prospects/${id}/status`, json("PUT", { status: "disqualified", structuralReason: "language" }));
    expect(services.updateProspectStatus).toHaveBeenCalledWith(actor, { prospectId: id, status: "disqualified", structuralReason: "language" });
  });
});
