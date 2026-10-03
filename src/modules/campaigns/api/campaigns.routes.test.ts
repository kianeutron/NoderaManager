// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { campaignsRoutes } from "@/modules/campaigns/api/campaigns.routes";
import type { CampaignsServices } from "@/modules/campaigns/application/create-campaigns-services";
import { getCampaignsServices } from "@/modules/campaigns/application/campaigns-services";
import { handleApiError } from "@/shared/api/api-error-handler";
import { AccessBoundaryError, requireDashboardOwner } from "@/shared/auth/access-boundary";
import { ApplicationError } from "@/shared/errors/application-error";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";
import { createActor } from "@/test/factories/actors";
import { createFakeServices } from "@/test/fake-services";

vi.mock("@/shared/auth/access-boundary", () => ({
  requireDashboardOwner: vi.fn(),
  AccessBoundaryError: class extends Error { public constructor(public readonly status: 401 | 403) { super("Access denied"); } }
}));
vi.mock("@/shared/rate-limit/rate-limiter", () => ({ getRateLimiter: vi.fn() }));
vi.mock("@/modules/campaigns/application/campaigns-services", () => ({ getCampaignsServices: vi.fn() }));

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const actor = createActor();
const enforce = vi.fn();
const app = new Hono().route("/campaigns", campaignsRoutes).onError(handleApiError);
const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("campaigns routes", () => {
  let services: ReturnType<typeof createFakeServices<CampaignsServices>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRateLimiter).mockReturnValue({ enforce });
    vi.mocked(requireDashboardOwner).mockResolvedValue(actor);
    services = createFakeServices<CampaignsServices>();
    vi.mocked(getCampaignsServices).mockReturnValue(services);
  });

  it("checks the owner before validating anything", async () => {
    vi.mocked(requireDashboardOwner).mockRejectedValue(new AccessBoundaryError(401));

    expect((await app.request("/campaigns?limit=9999")).status).toBe(401);
    expect(services.searchCampaigns).not.toHaveBeenCalled();
  });

  it("searches with validated, defaulted filters, uncached, and rejects bad input", async () => {
    services.searchCampaigns.mockResolvedValue({ items: [], total: 0, nextCursor: null });
    const response = await app.request(`/campaigns?q=q4&status=active&prospectId=${id}`);

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(services.searchCampaigns).toHaveBeenCalledWith({ q: "q4", status: "active", prospectId: id, scope: "active", sort: "updated", limit: 25 });
    for (const query of ["status=open", "scope=all", "cursor=garbage", "hack=1", "limit=51"]) expect((await app.request(`/campaigns?${query}`)).status).toBe(400);
  });

  it("returns one campaign and 404 for an unknown id, and serves members and suggestions with the id from the path", async () => {
    services.getCampaign.mockResolvedValueOnce({ id });
    expect(await (await app.request(`/campaigns/${id}`)).json()).toEqual({ id });
    services.getCampaign.mockResolvedValueOnce(null);
    const missing = await app.request(`/campaigns/${id}`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ code: "NOT_FOUND" });

    services.listCampaignProspects.mockResolvedValue({ items: [], total: 0, nextCursor: null });
    await app.request(`/campaigns/${id}/members?limit=10`);
    expect(services.listCampaignProspects).toHaveBeenCalledWith(id, { sort: "added", limit: 10 });

    services.suggestCampaignProspects.mockResolvedValue([]);
    expect(await (await app.request(`/campaigns/${id}/suggestions?q=marta`)).json()).toEqual({ suggestions: [] });
    expect(services.suggestCampaignProspects).toHaveBeenCalledWith(id, { q: "marta", limit: 25 });
  });

  it("creates as the verified actor and counts it as a write: 201, or 200 for an existing name", async () => {
    services.createCampaign.mockResolvedValueOnce({ campaignId: id, created: true, auditEventId: "a1" });
    const created = await app.request("/campaigns", json("POST", { name: "  Q4 agencies ", routes: [{ routeId }] }));
    expect(created.status).toBe(201);
    expect(services.createCampaign).toHaveBeenCalledWith(actor, expect.objectContaining({ name: "Q4 agencies", routes: [{ routeId }] }));
    expect(enforce).toHaveBeenCalledWith(actor.id, expect.objectContaining({ name: "web-write" }));

    services.createCampaign.mockResolvedValueOnce({ campaignId: id, created: false, auditEventId: null });
    expect((await app.request("/campaigns", json("POST", { name: "Q4 agencies" }))).status).toBe(200);
  });

  it.each([["no name", { name: " " }], ["a window out of order", { startsAt: "2026-12-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" }], ["a status of its own", { status: "active" }], ["a bad persona", { targetingRules: { personas: ["wizard"] } }]])("rejects %s before any service runs", async (_case, change) => {
    expect((await app.request("/campaigns", json("POST", { name: "x", ...change }))).status).toBe(400);
    expect(services.createCampaign).not.toHaveBeenCalled();
  });

  it("takes the id from the path for edits, routes, status, archiving and membership", async () => {
    services.updateCampaign.mockResolvedValue({ campaignId: id, changed: true, auditEventId: "a1" });
    await app.request(`/campaigns/${id}`, json("PATCH", { goal: null }));
    expect(services.updateCampaign).toHaveBeenCalledWith(actor, { campaignId: id, goal: null });
    expect((await app.request(`/campaigns/${id}`, json("PATCH", {}))).status).toBe(400);
    expect((await app.request(`/campaigns/${id}`, json("PATCH", { campaignId: id, goal: "x" }))).status).toBe(400);

    services.setCampaignRoutes.mockResolvedValue({ campaignId: id, changed: true, auditEventId: "a2" });
    await app.request(`/campaigns/${id}/routes`, json("PUT", { routes: [{ routeId }] }));
    expect(services.setCampaignRoutes).toHaveBeenCalledWith(actor, { campaignId: id, routes: [{ routeId }] });

    services.setCampaignStatus.mockResolvedValue({ campaignId: id, status: "active", previousStatus: "draft", changed: true, auditEventId: "a3" });
    await app.request(`/campaigns/${id}/status`, json("PUT", { status: "active" }));
    expect(services.setCampaignStatus).toHaveBeenCalledWith(actor, { campaignId: id, status: "active" });
    expect((await app.request(`/campaigns/${id}/status`, json("PUT", { status: "cancelled" }))).status).toBe(400);

    services.archiveCampaign.mockResolvedValue({ campaignId: id, archived: true, changed: true, auditEventId: "a4" });
    await app.request(`/campaigns/${id}/archive`, { method: "POST" });
    expect(services.archiveCampaign).toHaveBeenCalledWith(actor, { campaignId: id });
    services.restoreCampaign.mockResolvedValue({ campaignId: id, archived: false, changed: true, auditEventId: "a5" });
    await app.request(`/campaigns/${id}/restore`, { method: "POST" });
    expect(services.restoreCampaign).toHaveBeenCalledWith(actor, { campaignId: id });

    services.addCampaignProspects.mockResolvedValue({ campaignId: id, changed: 1, unchanged: 0, auditEventId: "a6" });
    await app.request(`/campaigns/${id}/prospects`, json("POST", { prospectIds: [routeId] }));
    expect(services.addCampaignProspects).toHaveBeenCalledWith(actor, { campaignId: id, prospectIds: [routeId] });
    services.removeCampaignProspects.mockResolvedValue({ campaignId: id, changed: 1, unchanged: 0, auditEventId: "a7" });
    await app.request(`/campaigns/${id}/prospects/remove`, json("POST", { prospectIds: [routeId] }));
    expect(services.removeCampaignProspects).toHaveBeenCalledWith(actor, { campaignId: id, prospectIds: [routeId] });
    expect((await app.request(`/campaigns/${id}/prospects`, json("POST", { prospectIds: [] }))).status).toBe(400);
  });

  it("turns a refusal into a 409 with its reason and no text", async () => {
    services.setCampaignStatus.mockRejectedValue(new ApplicationError("conflict", "Private: A completed campaign cannot become active.", "campaign_transition_invalid"));
    const response = await app.request(`/campaigns/${id}/status`, json("PUT", { status: "active" }));
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toMatchObject({ code: "CONFLICT", reason: "campaign_transition_invalid" });
    expect(text).not.toMatch(/Private/);
  });
});
