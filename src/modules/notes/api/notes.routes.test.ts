// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleApiError } from "@/shared/api/api-error-handler";
import { requireDashboardOwner } from "@/shared/auth/access-boundary";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";
import { notesRoutes } from "@/modules/notes/api/notes.routes";
import { getNotesServices } from "@/modules/notes/application/notes-services";
import type { NotesServices } from "@/modules/notes/application/create-notes-services";
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

vi.mock("@/modules/notes/application/notes-services", () => ({ getNotesServices: vi.fn() }));

const app = new Hono().route("/notes", notesRoutes).onError(handleApiError);

describe("notes routes", () => {
  let services: ReturnType<typeof createFakeServices<NotesServices>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRateLimiter).mockReturnValue({ enforce: vi.fn() });
    vi.mocked(requireDashboardOwner).mockResolvedValue(actor);
    services = createFakeServices<NotesServices>();
    vi.mocked(getNotesServices).mockReturnValue(services);
  });

  it("adds a note as the verified actor and answers 201", async () => {
    services.addNote.mockResolvedValue({ noteId: "n1", created: true, auditEventId: "a1" });
    const response = await app.request("/notes", json("POST", { body: "  Met at the conference ", targets: [{ targetType: "person", targetId: id }] }));

    expect(response.status).toBe(201);
    expect(services.addNote).toHaveBeenCalledWith(actor, { body: "Met at the conference", targets: [{ targetType: "person", targetId: id }] });
  });

  it.each([["an empty note", { body: " ", targets: [{ targetType: "person", targetId: id }] }], ["no target", { body: "x", targets: [] }], ["an unknown target type", { body: "x", targets: [{ targetType: "route", targetId: id }] }]])("rejects %s", async (_case, body) => {
    expect((await app.request("/notes", json("POST", body))).status).toBe(400);
    expect(services.addNote).not.toHaveBeenCalled();
  });
});
