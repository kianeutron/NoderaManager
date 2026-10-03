import { describe, expect, it } from "vitest";
import { createFollowUpInputSchema, dismissFollowUpInputSchema, followUpChangesSchema, followUpSearchQuerySchema, updateFollowUpInputSchema } from "@/modules/followups/domain/followup.schema";

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("createFollowUpInputSchema", () => {
  it("needs only a prospect and a reason, trimming the reason", () => {
    expect(createFollowUpInputSchema.parse({ prospectId, reason: "  Ask about Q1 budget  " })).toEqual({ prospectId, reason: "Ask about Q1 budget" });
  });

  it("reads dates as instants, in either order of arrival, and keeps a not-before on or before the due date", () => {
    const input = createFollowUpInputSchema.parse({ prospectId, reason: "x", dueAt: "2026-11-01T00:00:00Z", notBeforeAt: "2026-10-01T00:00:00Z" });
    expect(input.dueAt).toEqual(new Date("2026-11-01T00:00:00Z"));
    expect(createFollowUpInputSchema.safeParse({ prospectId, reason: "x", dueAt: "2026-10-01T00:00:00Z", notBeforeAt: "2026-11-01T00:00:00Z" }).success).toBe(false);
  });

  it.each([["an empty reason", { reason: "  " }], ["a reason over 500 characters", { reason: "x".repeat(501) }], ["a date that is not a timestamp", { dueAt: "next week" }], ["an unknown channel", { suggestedChannel: "fax" }], ["an unknown field", { status: "completed" }]])("rejects %s", (_case, change) => {
    expect(createFollowUpInputSchema.safeParse({ prospectId, reason: "x", ...change }).success).toBe(false);
  });

  it("allows a due date in the past, since a follow-up can be overdue from the start", () => {
    expect(createFollowUpInputSchema.safeParse({ prospectId, reason: "x", dueAt: "2020-01-01T00:00:00Z" }).success).toBe(true);
  });
});

describe("follow-up changes", () => {
  it("demands a change, for the command and for the web body, but lets null clear", () => {
    expect(followUpChangesSchema.safeParse({}).success).toBe(false);
    expect(updateFollowUpInputSchema.safeParse({ followUpId: prospectId }).success).toBe(false);
    expect(followUpChangesSchema.parse({ dueAt: null, suggestedChannel: null })).toEqual({ dueAt: null, suggestedChannel: null });
  });

  it("takes the id only in the command, and checks date order when both dates are sent", () => {
    expect(followUpChangesSchema.safeParse({ followUpId: prospectId, reason: "x" }).success).toBe(false);
    expect(updateFollowUpInputSchema.safeParse({ followUpId: prospectId, dueAt: "2026-10-01T00:00:00Z", notBeforeAt: "2026-11-01T00:00:00Z" }).success).toBe(false);
  });
});

describe("dismissFollowUpInputSchema", () => {
  it("needs a reason", () => {
    expect(dismissFollowUpInputSchema.safeParse({ followUpId: prospectId, reason: "Went with another vendor" }).success).toBe(true);
    expect(dismissFollowUpInputSchema.safeParse({ followUpId: prospectId, reason: " " }).success).toBe(false);
  });
});

describe("followUpSearchQuerySchema", () => {
  it("defaults to active, soonest due, 25 per page, and rejects a cursor it did not issue", () => {
    expect(followUpSearchQuerySchema.parse({})).toEqual({ status: "active", sort: "due", limit: 25 });
    expect(followUpSearchQuerySchema.safeParse({ cursor: "garbage" }).success).toBe(false);
    expect(followUpSearchQuerySchema.safeParse({ due: "tomorrow" }).success).toBe(false);
    expect(followUpSearchQuerySchema.parse({ due: "overdue" }).due).toBe("overdue");
  });
});
