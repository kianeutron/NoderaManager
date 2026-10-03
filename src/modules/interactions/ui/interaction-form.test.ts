import { describe, expect, it } from "vitest";
import { logInteractionInputSchema } from "@/modules/interactions/domain/interaction.schema";
import { emptyInteractionForm, fixedDirectionOf, toLogInteractionInput, type InteractionFormValues } from "@/modules/interactions/ui/interaction-form";

const context = { prospectId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90", outreachMessageId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91", idempotencyKey: "key-0123456789" };
const form = (changes: Partial<InteractionFormValues>): InteractionFormValues => ({ ...emptyInteractionForm(new Date(2026, 8, 30, 14, 5), "reply", "email"), body: "Yes, let's talk", ...changes });

describe("toLogInteractionInput", () => {
  it("starts on the given type and channel with the current local time", () => {
    expect(emptyInteractionForm(new Date(2026, 8, 30, 14, 5), "reply", "linkedin")).toMatchObject({ type: "reply", channel: "linkedin", occurredAt: "2026-09-30T14:05", responseDepth: "", sentiment: "" });
  });

  it("maps a reply to a valid command: received, tied to the message, depth as a number, time as an instant", () => {
    const input = toLogInteractionInput(form({ responseDepth: "4", sentiment: "positive" }), context);
    expect(input).toMatchObject({ prospectId: context.prospectId, outreachMessageId: context.outreachMessageId, direction: "inbound", type: "reply", responseDepth: 4, sentiment: "positive", idempotencyKey: "key-0123456789", occurredAt: new Date(2026, 8, 30, 14, 5).toISOString() });
    expect(logInteractionInputSchema.safeParse(input).success).toBe(true);
  });

  it("fixes the direction for replies and follow-ups whatever the form holds, and uses the chosen one for a call", () => {
    expect(fixedDirectionOf("reply")).toBe("inbound");
    expect(fixedDirectionOf("auto_reply")).toBe("inbound");
    expect(fixedDirectionOf("follow_up_message")).toBe("outbound");
    expect(fixedDirectionOf("call")).toBeNull();
    expect(toLogInteractionInput(form({ type: "reply", direction: "outbound" }), context)).toMatchObject({ direction: "inbound" });
    expect(toLogInteractionInput(form({ type: "follow_up_message", direction: "inbound" }), context)).toMatchObject({ direction: "outbound" });
    expect(toLogInteractionInput(form({ type: "call", direction: "outbound", body: "" }), context)).toMatchObject({ direction: "outbound" });
  });

  it("drops a depth chosen for something we sent, so a call we made is not classified as their response", () => {
    expect(toLogInteractionInput(form({ type: "call", direction: "outbound", body: "", responseDepth: "5" }), context)).not.toHaveProperty("responseDepth");
  });

  it("leaves out blanks and a cleared time", () => {
    const input = toLogInteractionInput(form({ subject: "  ", occurredAt: "" }), { ...context, outreachMessageId: undefined });
    expect(input).not.toHaveProperty("subject");
    expect(input).not.toHaveProperty("occurredAt");
    expect(input).not.toHaveProperty("outreachMessageId");
  });

  it("is refused by the command when a reply says nothing", () => {
    expect(logInteractionInputSchema.safeParse(toLogInteractionInput(form({ body: "  " }), context)).success).toBe(false);
  });
});
