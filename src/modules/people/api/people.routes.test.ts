// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { peopleRoutes } from "@/modules/people/api/people.routes";
import { AccessBoundaryError, requireDashboardOwner } from "@/shared/auth/access-boundary";
import { handleApiError } from "@/shared/api/api-error-handler";
import { RateLimitedError } from "@/shared/errors/application-error";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";
import { getPeopleServices } from "@/modules/people/application/people-services";
import { createFakeServices } from "@/test/fake-services";
import { createActor } from "@/test/factories/actors";
import type { PeopleServices } from "@/modules/people/application/create-people-services";

// Factories keep the real (server-only) modules from loading at all.
vi.mock("@/shared/auth/access-boundary", () => ({
  requireDashboardOwner: vi.fn(),
  AccessBoundaryError: class extends Error { public constructor(public readonly status: 401 | 403) { super("Access denied"); } }
}));
vi.mock("@/shared/rate-limit/rate-limiter", () => ({ getRateLimiter: vi.fn() }));
vi.mock("@/modules/people/application/people-services", () => ({ getPeopleServices: vi.fn() }));

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const app = new Hono().route("/people", peopleRoutes).onError(handleApiError);

const enforce = vi.fn();

describe("people routes", () => {
  let services: ReturnType<typeof createFakeServices<PeopleServices>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRateLimiter).mockReturnValue({ enforce });
    vi.mocked(requireDashboardOwner).mockResolvedValue(createActor());
    services = createFakeServices<PeopleServices>();
    vi.mocked(getPeopleServices).mockReturnValue(services);
  });

  it("checks the owner before validating anything", async () => {
    vi.mocked(requireDashboardOwner).mockRejectedValue(new AccessBoundaryError(401));

    const response = await app.request("/people?limit=9999");

    expect(response.status).toBe(401);
    expect(services.searchPeople).not.toHaveBeenCalled();
  });

  it("searches with validated, defaulted filters and never caches", async () => {
    services.searchPeople.mockResolvedValue({ items: [], total: 0, nextCursor: null });
    const response = await app.request("/people?q=marta&persona=recruiter&countryCode=de");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ items: [], total: 0, nextCursor: null });
    expect(services.searchPeople).toHaveBeenCalledWith({ q: "marta", persona: "recruiter", countryCode: "DE", sort: "updated", limit: 25, scope: "active" });
  });

  it.each([["an oversized page", "limit=51"], ["an unknown persona", "persona=wizard"], ["a garbage cursor", "cursor=garbage"], ["an unknown parameter", "hack=1"]])("rejects %s with the stable validation shape", async (_case, query) => {
    const response = await app.request(`/people?${query}`);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(services.searchPeople).not.toHaveBeenCalled();
  });

  it("returns one person, 404 for an unknown id and 400 for a malformed one", async () => {
    services.getPerson.mockResolvedValueOnce({ id, fullName: "Marta Chen" });
    expect(await (await app.request(`/people/${id}`)).json()).toEqual({ id, fullName: "Marta Chen" });

    services.getPerson.mockResolvedValueOnce(null);
    const missing = await app.request(`/people/${id}`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ code: "NOT_FOUND" });

    expect((await app.request("/people/not-an-id")).status).toBe(400);
  });

  it("keeps the duplicate-check endpoint and its response shape", async () => {
    services.findDuplicateCandidates.mockResolvedValue([{ personId: id, fullName: "Marta Chen", organizationName: null, matchLevel: "exact", reason: "Matching normalized email" }]);
    const response = await app.request("/people/duplicate-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName: "Marta Chen", email: "marta@bluewave.io" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { candidates: [{ personId: id, fullName: "Marta Chen", organizationName: null, matchLevel: "exact", reason: "Matching normalized email" }] } });

    const invalid = await app.request("/people/duplicate-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName: "Marta Chen" }) });
    expect(invalid.status).toBe(400);
  });

  describe("writes", () => {
    const actor = createActor();
    const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

    it("counts writes per actor and leaves reads uncounted", async () => {
      await app.request("/people?limit=1");
      expect(enforce).not.toHaveBeenCalled();

      await app.request("/people", json("POST", { fullName: "Marta Chen" }));
      expect(enforce).toHaveBeenCalledWith(actor.id, expect.objectContaining({ name: "web-write" }));
    });

    it("stops a write over the limit before it reaches a service", async () => {
      enforce.mockRejectedValue(new RateLimitedError(30));
      await app.request("/people", json("POST", { fullName: "Marta Chen" }));

      expect(services.createPerson).not.toHaveBeenCalled();
    });

    beforeEach(() => {
      vi.mocked(requireDashboardOwner).mockResolvedValue(actor);
    });

    it("creates a person as the verified actor and answers 201", async () => {
      services.createPerson.mockResolvedValue({ personId: id, created: true, auditEventId: "a1", possibleDuplicates: [] });
      const response = await app.request("/people", json("POST", { fullName: "Marta Chen", emails: ["marta@bluewave.io"] }));

      expect(response.status).toBe(201);
      expect(services.createPerson).toHaveBeenCalledWith(actor, expect.objectContaining({ fullName: "Marta Chen", emails: ["marta@bluewave.io"], languages: [], confirmNewIdentity: false }));
    });

    it("rejects unknown fields and empty updates before touching a service", async () => {
      expect((await app.request("/people", json("POST", { fullName: "Marta Chen", admin: true }))).status).toBe(400);
      expect((await app.request(`/people/${id}`, json("PATCH", {}))).status).toBe(400);
      expect(services.createPerson).not.toHaveBeenCalled();
      expect(services.updatePerson).not.toHaveBeenCalled();
    });

    it("takes the person id from the path, not the body", async () => {
      services.updatePerson.mockResolvedValue({ personId: id, changed: true, auditEventId: "a1" });
      const response = await app.request(`/people/${id}`, json("PATCH", { role: null }));

      expect(response.status).toBe(200);
      expect(services.updatePerson).toHaveBeenCalledWith(actor, { personId: id, role: null });
      expect((await app.request(`/people/${id}`, json("PATCH", { personId: "other", role: "CTO" }))).status).toBe(400);
    });

    it("archives and restores by path id, and replaces links", async () => {
      services.archivePerson.mockResolvedValue({ personId: id, archived: true, changed: true, auditEventId: "a1" });
      expect((await app.request(`/people/${id}/archive`, { method: "POST" })).status).toBe(200);
      expect(services.archivePerson).toHaveBeenCalledWith(actor, { personId: id });

      services.restorePerson.mockResolvedValue({ personId: id, archived: false, changed: true, auditEventId: "a2" });
      await app.request(`/people/${id}/restore`, { method: "POST" });
      expect(services.restorePerson).toHaveBeenCalledWith(actor, { personId: id });

      services.setPersonLinks.mockResolvedValue({ personId: id, count: 1, changed: true, auditEventId: "a3" });
      await app.request(`/people/${id}/links`, json("PUT", { links: [{ type: "website", url: "https://marta.dev" }] }));
      expect(services.setPersonLinks).toHaveBeenCalledWith(actor, { personId: id, links: [{ type: "website", url: "https://marta.dev" }] });
      expect((await app.request(`/people/${id}/links`, json("PUT", { links: [{ type: "website", url: "not a url" }] }))).status).toBe(400);
    });

    it("replaces emails and toggles do-not-contact", async () => {
      services.setPersonEmails.mockResolvedValue({ personId: id, emails: ["a@b.co"], changed: true, auditEventId: "a1" });
      await app.request(`/people/${id}/emails`, json("PUT", { emails: ["a@b.co"] }));
      expect(services.setPersonEmails).toHaveBeenCalledWith(actor, { personId: id, emails: ["a@b.co"] });

      services.markPersonDoNotContact.mockResolvedValue({ personId: id, doNotContact: true, changed: true, auditEventId: "a2" });
      await app.request(`/people/${id}/do-not-contact`, json("PUT", { reason: "Asked to stop" }));
      expect(services.markPersonDoNotContact).toHaveBeenCalledWith(actor, { personId: id, reason: "Asked to stop" });
      expect((await app.request(`/people/${id}/do-not-contact`, json("PUT", { reason: "  " }))).status).toBe(400);

      services.clearPersonDoNotContact.mockResolvedValue({ personId: id, doNotContact: false, changed: true, auditEventId: "a3" });
      expect((await app.request(`/people/${id}/do-not-contact`, { method: "DELETE" })).status).toBe(200);
      expect(services.clearPersonDoNotContact).toHaveBeenCalledWith(actor, { personId: id });
    });
  });
});
