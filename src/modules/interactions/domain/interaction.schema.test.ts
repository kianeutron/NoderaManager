import { describe, expect, it } from "vitest";
import { listInteractionsQuerySchema, logBounceInputSchema, logInteractionInputSchema } from "@/modules/interactions/domain/interaction.schema";

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const reply = { prospectId, direction: "inbound", channel: "email", type: "reply", body: "Yes, let's talk" } as const;

describe("logInteractionInputSchema", () => {
  it("accepts a reply and trims its text", () => {
    expect(logInteractionInputSchema.parse({ ...reply, body: "  Yes  " })).toEqual({ ...reply, body: "Yes" });
  });

  it.each([
    ["a reply that is outbound", { direction: "outbound" }, "direction"],
    ["an auto-reply that is outbound", { type: "auto_reply", direction: "outbound" }, "direction"],
    ["a follow-up message that is inbound", { type: "follow_up_message", direction: "inbound" }, "direction"],
    ["a reply with nothing said", { body: undefined }, "body"],
    ["a follow-up with nothing said", { type: "follow_up_message", direction: "outbound", body: undefined }, "body"],
    ["a response depth on something we sent", { type: "call", direction: "outbound", body: undefined, responseDepth: 3 }, "responseDepth"]
  ])("refuses %s, naming the field", (_case, change, field) => {
    const result = logInteractionInputSchema.safeParse({ ...reply, ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain(field);
  });

  it("takes a call with no text, a depth from 1 to 9 on their side, and refuses others", () => {
    expect(logInteractionInputSchema.safeParse({ prospectId, direction: "outbound", channel: "other", type: "call" }).success).toBe(true);
    expect(logInteractionInputSchema.safeParse({ ...reply, responseDepth: 9 }).success).toBe(true);
    for (const responseDepth of [0, 10, 1.5]) expect(logInteractionInputSchema.safeParse({ ...reply, responseDepth }).success).toBe(false);
  });

  it("does not take a bounce here, a future time, or an unknown field", () => {
    expect(logInteractionInputSchema.safeParse({ ...reply, type: "bounce_notice" }).success).toBe(false);
    expect(logInteractionInputSchema.safeParse({ ...reply, occurredAt: new Date(Date.now() + 3_600_000).toISOString() }).success).toBe(false);
    expect(logInteractionInputSchema.safeParse({ ...reply, personId: prospectId }).success).toBe(false);
  });

  it("reads a past time as a date", () => {
    expect(logInteractionInputSchema.parse({ ...reply, occurredAt: "2026-01-02T10:00:00Z" }).occurredAt).toEqual(new Date("2026-01-02T10:00:00Z"));
  });
});

describe("logBounceInputSchema", () => {
  it("takes a soft, hard or blocked bounce and nothing else", () => {
    for (const bounceStatus of ["soft", "hard", "blocked"]) expect(logBounceInputSchema.safeParse({ outreachMessageId: prospectId, bounceStatus }).success).toBe(true);
    for (const bounceStatus of ["none", "failed"]) expect(logBounceInputSchema.safeParse({ outreachMessageId: prospectId, bounceStatus }).success).toBe(false);
  });
});

describe("listInteractionsQuerySchema", () => {
  it("needs a prospect and bounds the size", () => {
    expect(listInteractionsQuerySchema.parse({ prospectId })).toEqual({ prospectId, limit: 25 });
    expect(listInteractionsQuerySchema.safeParse({}).success).toBe(false);
    expect(listInteractionsQuerySchema.safeParse({ prospectId, limit: "51" }).success).toBe(false);
  });
});
