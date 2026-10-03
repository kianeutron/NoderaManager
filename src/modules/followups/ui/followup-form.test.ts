import { describe, expect, it } from "vitest";
import { createFollowUpInputSchema, followUpChangesSchema } from "@/modules/followups/domain/followup.schema";
import type { FollowUpView } from "@/modules/followups/domain/followup.types";
import { dueAtInDays, emptyFollowUpForm, followUpToFormValues, toCreateFollowUpInput, toFollowUpChanges, toFollowUpEditValidationInput } from "@/modules/followups/ui/followup-form";

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const target = { prospectId, personName: "Marta Chen", organizationName: null, routeName: "Agencies", status: "contacted" } as const;
const saved: FollowUpView = {
  id: "f1", status: "active", reason: "Ask about budget", dueAt: new Date(2026, 10, 1, 9, 0).toISOString(), notBeforeAt: null, suggestedChannel: "email", completedAt: null, dismissedReason: null,
  createdAt: "2026-09-01T00:00:00.000Z", prospect: { id: prospectId, status: "contacted", routeName: "Agencies" }, person: null, organization: null
};

describe("toCreateFollowUpInput", () => {
  it("maps the picked prospect, the reason and the dates to a valid command, leaving blanks out", () => {
    const input = toCreateFollowUpInput({ ...emptyFollowUpForm, target, reason: "  Ask about budget ", dueAt: "2026-11-01T09:00" }, undefined);
    expect(input).toEqual({ prospectId, reason: "Ask about budget", dueAt: new Date(2026, 10, 1, 9, 0).toISOString() });
    expect(createFollowUpInputSchema.safeParse(input).success).toBe(true);
  });

  it("takes the prospect and the origin from a message when started from one", () => {
    const input = toCreateFollowUpInput({ ...emptyFollowUpForm, reason: "Nudge", suggestedChannel: "linkedin" }, { prospectId, originOutreachMessageId: "m1" });
    expect(input).toEqual({ prospectId, reason: "Nudge", suggestedChannel: "linkedin", originOutreachMessageId: "m1" });
  });

  it("has no prospect until one is chosen, which the command then asks for", () => {
    expect(createFollowUpInputSchema.safeParse(toCreateFollowUpInput({ ...emptyFollowUpForm, reason: "x" }, undefined)).success).toBe(false);
  });
});

describe("editing", () => {
  const initial = followUpToFormValues(saved);

  it("round-trips the saved values to the minute", () => {
    expect(initial).toMatchObject({ reason: "Ask about budget", dueAt: "2026-11-01T09:00", notBeforeAt: "", suggestedChannel: "email" });
    expect(toFollowUpChanges(initial, initial)).toEqual({});
  });

  it("sends only what changed, using null to clear", () => {
    expect(toFollowUpChanges({ ...initial, dueAt: "", suggestedChannel: "", reason: "New reason", notBeforeAt: "2026-10-01T09:00" }, initial)).toEqual({ reason: "New reason", dueAt: null, suggestedChannel: null, notBeforeAt: new Date(2026, 9, 1, 9, 0).toISOString() });
  });

  it("validates both dates in full, so a not-before after the untouched due date is caught", () => {
    const edited = { ...initial, notBeforeAt: "2026-12-01T09:00" };
    expect(followUpChangesSchema.safeParse(toFollowUpEditValidationInput(edited, initial)).success).toBe(false);
    expect(followUpChangesSchema.safeParse(toFollowUpEditValidationInput({ ...initial, notBeforeAt: "2026-10-01T09:00" }, initial)).success).toBe(true);
  });
});

describe("dueAtInDays", () => {
  it("is 9 in the morning, local time, that many days ahead, across a month end", () => {
    expect(dueAtInDays(1, new Date(2026, 8, 30, 15, 42))).toBe("2026-10-01T09:00");
    expect(dueAtInDays(7, new Date(2026, 8, 30, 15, 42))).toBe("2026-10-07T09:00");
  });
});
