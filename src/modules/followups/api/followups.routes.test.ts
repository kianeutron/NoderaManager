// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { followUpsRoutes } from "@/modules/followups/api/followups.routes";
import type { FollowUpsServices } from "@/modules/followups/application/create-followups-services";
import { getFollowUpsServices } from "@/modules/followups/application/followups-services";
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
vi.mock("@/modules/followups/application/followups-services", () => ({ getFollowUpsServices: vi.fn() }));

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const actor = createActor();
const enforce = vi.fn();
const app = new Hono().route("/followups", followUpsRoutes).onError(handleApiError);
const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("follow-ups routes", () => {
  let services: ReturnType<typeof createFakeServices<FollowUpsServices>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRateLimiter).mockReturnValue({ enforce });
    vi.mocked(requireDashboardOwner).mockResolvedValue(actor);
    services = createFakeServices<FollowUpsServices>();
    vi.mocked(getFollowUpsServices).mockReturnValue(services);
  });

  it("checks the owner before validating anything", async () => {
    vi.mocked(requireDashboardOwner).mockRejectedValue(new AccessBoundaryError(401));

    expect((await app.request("/followups?limit=9999")).status).toBe(401);
    expect(services.searchFollowUps).not.toHaveBeenCalled();
  });

  it("searches with validated, defaulted filters, uncached", async () => {
    services.searchFollowUps.mockResolvedValue({ items: [], total: 0, nextCursor: null });
    const response = await app.request("/followups?due=overdue");

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(services.searchFollowUps).toHaveBeenCalledWith({ status: "active", due: "overdue", sort: "due", limit: 25 });
    for (const query of ["due=tomorrow", "status=open", "cursor=garbage", "hack=1", "limit=51"]) expect((await app.request(`/followups?${query}`)).status).toBe(400);
  });

  it("serves the summary and one follow-up, with 404 for an unknown id", async () => {
    services.getFollowUpSummary.mockResolvedValue({ overdue: 1, next7Days: 2, later: 3, noDate: 4 });
    expect(await (await app.request("/followups/summary")).json()).toEqual({ overdue: 1, next7Days: 2, later: 3, noDate: 4 });

    services.getFollowUp.mockResolvedValueOnce({ id });
    expect(await (await app.request(`/followups/${id}`)).json()).toEqual({ id });
    services.getFollowUp.mockResolvedValueOnce(null);
    const missing = await app.request(`/followups/${id}`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ code: "NOT_FOUND" });
  });

  it("creates as the verified actor and counts it as a write: 201, or 200 for an existing one", async () => {
    services.createFollowUp.mockResolvedValueOnce({ followUpId: id, created: true, auditEventId: "a1" });
    const created = await app.request("/followups", json("POST", { prospectId: id, reason: "  Ask about budget " }));
    expect(created.status).toBe(201);
    expect(services.createFollowUp).toHaveBeenCalledWith(actor, { prospectId: id, reason: "Ask about budget" });
    expect(enforce).toHaveBeenCalledWith(actor.id, expect.objectContaining({ name: "web-write" }));

    services.createFollowUp.mockResolvedValueOnce({ followUpId: id, created: false, auditEventId: null });
    expect((await app.request("/followups", json("POST", { prospectId: id, reason: "Ask about budget" }))).status).toBe(200);
  });

  it.each([["no reason", { reason: " " }], ["dates out of order", { dueAt: "2026-10-01T00:00:00Z", notBeforeAt: "2026-11-01T00:00:00Z" }], ["an unknown field", { status: "completed" }]])("rejects %s before any service runs", async (_case, change) => {
    expect((await app.request("/followups", json("POST", { prospectId: id, reason: "x", ...change }))).status).toBe(400);
    expect(services.createFollowUp).not.toHaveBeenCalled();
  });

  it("takes the id from the path for edits, completion and dismissal", async () => {
    services.updateFollowUp.mockResolvedValue({ followUpId: id, changed: true, auditEventId: "a1" });
    await app.request(`/followups/${id}`, json("PATCH", { dueAt: null }));
    expect(services.updateFollowUp).toHaveBeenCalledWith(actor, { followUpId: id, dueAt: null });
    expect((await app.request(`/followups/${id}`, json("PATCH", {}))).status).toBe(400);
    expect((await app.request(`/followups/${id}`, json("PATCH", { followUpId: id, reason: "x" }))).status).toBe(400);

    services.completeFollowUp.mockResolvedValue({ followUpId: id, status: "completed", changed: true, auditEventId: "a2" });
    expect((await app.request(`/followups/${id}/complete`, { method: "POST" })).status).toBe(200);
    expect(services.completeFollowUp).toHaveBeenCalledWith(actor, { followUpId: id });

    services.dismissFollowUp.mockResolvedValue({ followUpId: id, status: "dismissed", changed: true, auditEventId: "a3" });
    await app.request(`/followups/${id}/dismiss`, json("POST", { reason: "Not worth it" }));
    expect(services.dismissFollowUp).toHaveBeenCalledWith(actor, { followUpId: id, reason: "Not worth it" });
    expect((await app.request(`/followups/${id}/dismiss`, json("POST", { reason: " " }))).status).toBe(400);
  });

  it("turns a refusal into a 409 with its reason and no text", async () => {
    services.updateFollowUp.mockRejectedValue(new ApplicationError("conflict", "Private: already completed on 3 Sep", "follow_up_finished"));
    const response = await app.request(`/followups/${id}`, json("PATCH", { reason: "x" }));
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toMatchObject({ code: "CONFLICT", reason: "follow_up_finished" });
    expect(text).not.toMatch(/Private/);
  });
});
