// @vitest-environment node
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { sameOriginOnly } from "@/shared/api/same-origin-only";

vi.mock("@/shared/auth/access-boundary", () => ({ AccessBoundaryError: class extends Error { public constructor(public readonly status: number) { super("Access denied"); } } }));

const app = new Hono()
  .use(sameOriginOnly)
  .all("/thing", (context) => context.text("ok"))
  .onError((error, context) => context.text(error.message, (error as { status?: 403 }).status ?? 500));

describe("sameOriginOnly", () => {
  it.each(["GET", "HEAD", "OPTIONS"])("lets %s through without an origin", async (method) => {
    expect((await app.request("http://app.test/thing", { method })).status).toBe(200);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("accepts %s from the same origin", async (method) => {
    expect((await app.request("http://app.test/thing", { method, headers: { origin: "http://app.test" } })).status).toBe(200);
  });

  it.each([["a foreign origin", { origin: "https://evil.test" }], ["no origin", {}], ["an opaque origin", { origin: "null" }]])("refuses a write with %s", async (_case, headers) => {
    expect((await app.request("http://app.test/thing", { method: "POST", headers })).status).toBe(403);
  });
});
