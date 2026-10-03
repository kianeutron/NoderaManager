import { describe, expect, it } from "vitest";
import { logOutreachInputSchema } from "@/modules/outreach/domain/outreach.schema";
import { emptyOutreachForm, toLogOutreachInput, type OutreachFormValues } from "@/modules/outreach/ui/outreach-form";

const target = { prospectId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90", personName: "Marta Chen", organizationName: null, routeName: "Agencies", status: "ready" } as const;
const filled = (changes: Partial<OutreachFormValues>): OutreachFormValues => ({ ...emptyOutreachForm(new Date(2026, 8, 30, 14, 5)), target, body: "Hi Marta", ...changes });

describe("toLogOutreachInput", () => {
  it("starts with the current local time and email", () => {
    expect(emptyOutreachForm(new Date(2026, 8, 30, 14, 5))).toMatchObject({ channel: "email", sentAt: "2026-09-30T14:05", target: null });
  });

  it("maps a filled form to a valid command, with the send time as an ISO instant and blanks left out", () => {
    const input = toLogOutreachInput(filled({ subject: "  " }), "key-0123456789");
    expect(input).toEqual({ prospectId: target.prospectId, channel: "email", body: "Hi Marta", idempotencyKey: "key-0123456789", sentAt: new Date(2026, 8, 30, 14, 5).toISOString() });

    const parsed = logOutreachInputSchema.parse(input);
    expect(parsed.sentAt).toEqual(new Date(2026, 8, 30, 14, 5));
  });

  it("leaves the send time out when it is cleared, so the service records now", () => {
    expect(toLogOutreachInput(filled({ sentAt: "" }), "key-0123456789")).not.toHaveProperty("sentAt");
  });

  it("has no prospect until one is chosen, which the command then asks for", () => {
    expect(logOutreachInputSchema.safeParse(toLogOutreachInput(filled({ target: null }), "key-0123456789")).success).toBe(false);
  });

  it("gives the same key for the same opening, so a retry is recognised", () => {
    expect(toLogOutreachInput(filled({}), "key-0123456789")).toMatchObject({ idempotencyKey: "key-0123456789" });
  });

  it("carries the chosen campaign, and leaves it out when there is none", () => {
    expect(toLogOutreachInput(filled({ campaignId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d95" }), "key-0123456789")).toMatchObject({ campaignId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d95" });
    expect(toLogOutreachInput(filled({}), "key-0123456789")).not.toHaveProperty("campaignId");
  });
});
