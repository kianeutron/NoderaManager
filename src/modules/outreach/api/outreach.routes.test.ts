// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { outreachRoutes } from "@/modules/outreach/api/outreach.routes";
import type { OutreachServices } from "@/modules/outreach/application/create-outreach-services";
import { getOutreachServices } from "@/modules/outreach/application/outreach-services";
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
vi.mock("@/modules/outreach/application/outreach-services", () => ({ getOutreachServices: vi.fn() }));

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const actor = createActor();
const enforce = vi.fn();
const app = new Hono().route("/outreach", outreachRoutes).onError(handleApiError);
const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("outreach routes", () => {
  let services: ReturnType<typeof createFakeServices<OutreachServices>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRateLimiter).mockReturnValue({ enforce });
    vi.mocked(requireDashboardOwner).mockResolvedValue(actor);
    services = createFakeServices<OutreachServices>();
    vi.mocked(getOutreachServices).mockReturnValue(services);
  });

  it("checks the owner before validating anything", async () => {
    vi.mocked(requireDashboardOwner).mockRejectedValue(new AccessBoundaryError(401));
    const response = await app.request("/outreach/messages?limit=9999");

    expect(response.status).toBe(401);
    expect(services.searchOutreach).not.toHaveBeenCalled();
  });

  it("searches with validated, defaulted filters and never caches", async () => {
    services.searchOutreach.mockResolvedValue({ items: [], total: 0, nextCursor: null });
    const response = await app.request("/outreach/messages?q=marta&channel=linkedin");

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(services.searchOutreach).toHaveBeenCalledWith({ q: "marta", channel: "linkedin", sort: "sent", limit: 25 });
  });

  it.each([["an oversized page", "limit=51"], ["an unknown channel", "channel=fax"], ["a garbage cursor", "cursor=garbage"], ["an unknown parameter", "hack=1"]])("rejects %s", async (_case, query) => {
    expect((await app.request(`/outreach/messages?${query}`)).status).toBe(400);
    expect(services.searchOutreach).not.toHaveBeenCalled();
  });

  it("returns one message and 404 for an unknown id", async () => {
    services.getOutreachMessage.mockResolvedValueOnce({ id });
    expect(await (await app.request(`/outreach/messages/${id}`)).json()).toEqual({ id });

    services.getOutreachMessage.mockResolvedValueOnce(null);
    const missing = await app.request(`/outreach/messages/${id}`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ code: "NOT_FOUND" });
  });

  it("serves the summary and the targets for the picker", async () => {
    services.getOutreachSummary.mockResolvedValue({ total: 3, last7Days: 1, delivered: 0, replied: 1 });
    expect(await (await app.request("/outreach/summary")).json()).toEqual({ total: 3, last7Days: 1, delivered: 0, replied: 1 });

    services.listOutreachTargets.mockResolvedValue([{ prospectId: id }]);
    expect(await (await app.request("/outreach/targets?q=marta")).json()).toEqual({ targets: [{ prospectId: id }] });
    expect(services.listOutreachTargets).toHaveBeenCalledWith({ q: "marta" });
  });

  describe("logging", () => {
    it("logs as the verified actor, counts it as a write, and answers 201", async () => {
      services.logOutreach.mockResolvedValue({ messageId: id, created: true, auditEventId: "a1", prospectStatus: "contacted" });
      const response = await app.request("/outreach/messages", json("POST", { prospectId: id, channel: "email", body: "  Hi  " }));

      expect(response.status).toBe(201);
      expect(services.logOutreach).toHaveBeenCalledWith(actor, { prospectId: id, channel: "email", body: "Hi" });
      expect(enforce).toHaveBeenCalledWith(actor.id, expect.objectContaining({ name: "web-write" }));
    });

    it("answers 200 when an identical earlier message was found", async () => {
      services.logOutreach.mockResolvedValue({ messageId: id, created: false, auditEventId: null, prospectStatus: "contacted" });
      expect((await app.request("/outreach/messages", json("POST", { prospectId: id, channel: "email", body: "Hi" }))).status).toBe(200);
    });

    it("rejects a caller-supplied person and an empty body before any service runs", async () => {
      expect((await app.request("/outreach/messages", json("POST", { prospectId: id, channel: "email", body: "Hi", personId: id }))).status).toBe(400);
      expect((await app.request("/outreach/messages", json("POST", { prospectId: id, channel: "email", body: " " }))).status).toBe(400);
      expect(services.logOutreach).not.toHaveBeenCalled();
    });

    it("turns a do-not-contact refusal into a 409 with its reason and no message text", async () => {
      services.logOutreach.mockRejectedValue(new ApplicationError("conflict", "Private: Marta asked to stop", "person_do_not_contact"));
      const response = await app.request("/outreach/messages", json("POST", { prospectId: id, channel: "email", body: "Hi" }));

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: "CONFLICT", reason: "person_do_not_contact" });
    });
  });
});
