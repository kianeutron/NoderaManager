import { describe, expect, it } from "vitest";
import { logOutreachInputSchema, outreachSearchQuerySchema } from "@/modules/outreach/domain/outreach.schema";

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("logOutreachInputSchema", () => {
  it("trims, and leaves the send time and subject out when not given", () => {
    expect(logOutreachInputSchema.parse({ prospectId, channel: "email", body: "  Hi Marta  " })).toEqual({ prospectId, channel: "email", body: "Hi Marta" });
  });

  it("takes a past send time as a date, and refuses the future", () => {
    expect(logOutreachInputSchema.parse({ prospectId, channel: "linkedin", body: "x", sentAt: "2026-01-02T10:00:00Z" }).sentAt).toEqual(new Date("2026-01-02T10:00:00Z"));
    expect(logOutreachInputSchema.safeParse({ prospectId, channel: "email", body: "x", sentAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }).success).toBe(false);
  });

  it.each([
    ["an empty message", { body: "  " }],
    ["an unknown channel", { channel: "fax" }],
    ["a person or organization supplied by the caller", { personId: prospectId }],
    ["a too-short idempotency key", { idempotencyKey: "abc" }]
  ])("rejects %s", (_case, extra) => {
    expect(logOutreachInputSchema.safeParse({ prospectId, channel: "email", body: "x", ...extra }).success).toBe(false);
  });
});

describe("outreachSearchQuerySchema", () => {
  it("defaults the sort and page size, and rejects a cursor it did not issue", () => {
    expect(outreachSearchQuerySchema.parse({})).toEqual({ sort: "sent", limit: 25 });
    expect(outreachSearchQuerySchema.safeParse({ cursor: "garbage" }).success).toBe(false);
    expect(outreachSearchQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
  });
});
