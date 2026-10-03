import { describe, expect, it, vi } from "vitest";
import { logBounce } from "@/modules/interactions/application/log-bounce.service";
import { createActor } from "@/test/factories/actors";

const messageId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d92";
const message = { id: messageId, prospectId: "p1", channel: "email", replyStatus: "none", bounceStatus: "none", deliveryStatus: "sent" };

function createDependencies(found: Record<string, unknown> | null = message) {
  return { reads: { findMessage: vi.fn().mockResolvedValue(found) }, commands: { recordBounce: vi.fn().mockResolvedValue("audit-1") } };
}

describe("logBounce", () => {
  it("records the bounce against the message's prospect and channel, and audits it", async () => {
    const dependencies = createDependencies();
    const result = await logBounce(dependencies, createActor(), { outreachMessageId: messageId, bounceStatus: "hard" });

    expect(dependencies.commands.recordBounce).toHaveBeenCalledWith(expect.objectContaining({ prospectId: "p1", outreachMessageId: messageId, channel: "email", bounceStatus: "hard", audit: expect.objectContaining({ action: "outreach.bounce_logged", metadata: expect.objectContaining({ previousBounceStatus: "none" }) }) }));
    expect(result).toEqual({ outreachMessageId: messageId, bounceStatus: "hard", changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when the message already has this bounce, so a retry is safe", async () => {
    const dependencies = createDependencies({ ...message, bounceStatus: "hard" });

    await expect(logBounce(dependencies, createActor(), { outreachMessageId: messageId, bounceStatus: "hard" })).resolves.toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.commands.recordBounce).not.toHaveBeenCalled();
  });

  it("updates a soft bounce that turned out hard", async () => {
    const dependencies = createDependencies({ ...message, bounceStatus: "soft" });

    await expect(logBounce(dependencies, createActor(), { outreachMessageId: messageId, bounceStatus: "hard" })).resolves.toMatchObject({ changed: true });
    expect(dependencies.commands.recordBounce).toHaveBeenCalledWith(expect.objectContaining({ audit: expect.objectContaining({ metadata: expect.objectContaining({ previousBounceStatus: "soft" }) }) }));
  });

  it("reports an unknown message", async () => {
    await expect(logBounce(createDependencies(null), createActor(), { outreachMessageId: messageId, bounceStatus: "soft" })).rejects.toMatchObject({ code: "not_found", reason: "outreach_message_not_found" });
  });
});
