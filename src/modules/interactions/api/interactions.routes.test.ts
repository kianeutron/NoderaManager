// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { interactionsRoutes } from "@/modules/interactions/api/interactions.routes";
import type { InteractionsServices } from "@/modules/interactions/application/create-interactions-services";
import { getInteractionsServices } from "@/modules/interactions/application/interactions-services";
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
vi.mock("@/modules/interactions/application/interactions-services", () => ({ getInteractionsServices: vi.fn() }));

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const actor = createActor();
const enforce = vi.fn();
const app = new Hono().route("/interactions", interactionsRoutes).onError(handleApiError);
const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const reply = { prospectId: id, direction: "inbound", channel: "email", type: "reply", body: "Yes" };

describe("interactions routes", () => {
  let services: ReturnType<typeof createFakeServices<InteractionsServices>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRateLimiter).mockReturnValue({ enforce });
    vi.mocked(requireDashboardOwner).mockResolvedValue(actor);
    services = createFakeServices<InteractionsServices>();
    vi.mocked(getInteractionsServices).mockReturnValue(services);
  });

  it("checks the owner before validating anything", async () => {
    vi.mocked(requireDashboardOwner).mockRejectedValue(new AccessBoundaryError(401));

    expect((await app.request("/interactions?prospectId=nope")).status).toBe(401);
    expect(services.listInteractions).not.toHaveBeenCalled();
  });

  it("lists a prospect's interactions, uncached, and needs a prospect", async () => {
    services.listInteractions.mockResolvedValue([]);
    const response = await app.request(`/interactions?prospectId=${id}`);

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ interactions: [] });
    expect(services.listInteractions).toHaveBeenCalledWith({ prospectId: id, limit: 25 });
    expect((await app.request("/interactions")).status).toBe(400);
  });

  it("logs as the verified actor, counts it as a write, and answers 201 (200 for a repeat)", async () => {
    services.logInteraction.mockResolvedValueOnce({ interactionId: id, created: true, auditEventId: "a1", prospectStatus: "replied", messageReplyStatus: null });
    const created = await app.request("/interactions", json("POST", reply));
    expect(created.status).toBe(201);
    expect(services.logInteraction).toHaveBeenCalledWith(actor, reply);
    expect(enforce).toHaveBeenCalledWith(actor.id, expect.objectContaining({ name: "web-write" }));

    services.logInteraction.mockResolvedValueOnce({ interactionId: id, created: false, auditEventId: null, prospectStatus: "replied", messageReplyStatus: null });
    expect((await app.request("/interactions", json("POST", reply))).status).toBe(200);
  });

  it.each([["an outbound reply", { direction: "outbound" }], ["a reply with nothing said", { body: undefined }], ["a bounce through this door", { type: "bounce_notice" }], ["an unknown field", { personId: id }]])("rejects %s before any service runs", async (_case, change) => {
    expect((await app.request("/interactions", json("POST", { ...reply, ...change }))).status).toBe(400);
    expect(services.logInteraction).not.toHaveBeenCalled();
  });

  it("reports a bounce as the verified actor", async () => {
    services.logBounce.mockResolvedValue({ outreachMessageId: id, bounceStatus: "hard", changed: true, auditEventId: "a1" });
    const response = await app.request("/interactions/bounces", json("POST", { outreachMessageId: id, bounceStatus: "hard" }));

    expect(response.status).toBe(200);
    expect(services.logBounce).toHaveBeenCalledWith(actor, { outreachMessageId: id, bounceStatus: "hard" });
    expect((await app.request("/interactions/bounces", json("POST", { outreachMessageId: id, bounceStatus: "none" }))).status).toBe(400);
  });

  it("turns a refusal into a 409 with its reason and no text", async () => {
    services.logInteraction.mockRejectedValue(new ApplicationError("conflict", "Private: Marta asked to stop", "person_do_not_contact"));
    const response = await app.request("/interactions", json("POST", { ...reply, direction: "outbound", type: "follow_up_message" }));

    const text = await response.text();
    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toMatchObject({ code: "CONFLICT", reason: "person_do_not_contact" });
    expect(text).not.toMatch(/Private/);
  });
});
