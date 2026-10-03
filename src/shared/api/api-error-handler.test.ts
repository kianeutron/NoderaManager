// @vitest-environment node
import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { validator } from "hono/validator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { handleApiError, handleApiNotFound } from "@/shared/api/api-error-handler";
import { ApplicationError } from "@/shared/errors/application-error";

vi.mock("@/shared/auth/access-boundary", () => ({ AccessBoundaryError: class extends Error { public constructor(public readonly status: 401 | 403) { super("Access denied"); } } }));

const { AccessBoundaryError } = await import("@/shared/auth/access-boundary");

const app = new Hono()
  .use(requestId())
  .post("/json", validator("json", (value) => value), (context) => context.json({ ok: true }))
  .get("/throw/:kind", (context) => {
    const kind = context.req.param("kind");
    if (kind === "application") throw new ApplicationError("conflict", "Private detail: person 0198d5a0", "email_taken");
    if (kind === "not-found") throw new ApplicationError("not_found", "Person not found");
    if (kind === "limit") throw new ApplicationError("limit_exceeded", "Too big");
    if (kind === "auth") throw new AccessBoundaryError(401);
    if (kind === "forbidden") throw new AccessBoundaryError(403);
    if (kind === "zod") z.string().parse(1);
    if (kind === "database") throw Object.assign(new Error("duplicate key value violates unique constraint (secret@example.com)"), { code: "23505" });
    throw new Error("connect ECONNREFUSED postgres://user:hunter2@db.internal/app");
  })
  .onError(handleApiError)
  .notFound(handleApiNotFound);

describe("handleApiError", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["application", 409, { code: "CONFLICT", reason: "email_taken" }],
    ["not-found", 404, { code: "NOT_FOUND" }],
    ["limit", 400, { code: "LIMIT_EXCEEDED" }],
    ["auth", 401, { code: "UNAUTHENTICATED" }],
    ["forbidden", 403, { code: "FORBIDDEN" }],
    ["zod", 400, { code: "VALIDATION_ERROR" }],
    ["database", 409, { code: "CONFLICT", reason: "already_exists" }]
  ])("maps a %s failure to %s with a stable body", async (kind, status, body) => {
    const response = await app.request(`/throw/${kind}`);

    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject(body);
  });

  it("never sends the message of an expected failure to the browser", async () => {
    const text = await (await app.request("/throw/application")).text();
    expect(text).not.toMatch(/Private detail|0198d5a0/);
    expect(JSON.parse(text)).not.toHaveProperty("message");
  });

  it("masks an unexpected failure, keeps the request id, and logs without the message", async () => {
    const response = await app.request("/throw/boom");
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toMatch(/ECONNREFUSED|hunter2|postgres/);
    const body = JSON.parse(text) as { code: string; requestId: string };
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.requestId).toBe(response.headers.get("x-request-id"));

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain(body.requestId);
    expect(logged).not.toMatch(/ECONNREFUSED|hunter2/);
  });

  it("treats malformed JSON as the caller's mistake, not a server error", async () => {
    const response = await app.request("/json", { method: "POST", headers: { "content-type": "application/json" }, body: "{not json" });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "BAD_REQUEST" });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("answers an unknown route in the same shape", async () => {
    const response = await app.request("/nope");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "NOT_FOUND" });
  });
});
