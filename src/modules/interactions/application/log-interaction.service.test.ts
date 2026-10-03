import { describe, expect, it, vi } from "vitest";
import { logInteraction } from "@/modules/interactions/application/log-interaction.service";
import { logInteractionInputSchema } from "@/modules/interactions/domain/interaction.schema";
import { createActor } from "@/test/factories/actors";

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const messageId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d92";

const target = {
  prospectId, status: "contacted", archivedAt: null, routeId: "r1", routeModuleId: null,
  personId, personExists: personId, personArchivedAt: null, doNotContactAt: null,
  organizationId: null, organizationExists: null, organizationArchivedAt: null
};
const message = { id: messageId, prospectId, channel: "email", replyStatus: "none", bounceStatus: "none", deliveryStatus: "sent" };

type Overrides = Readonly<{ target?: Record<string, unknown> | null; message?: Record<string, unknown> | null; earlier?: Record<string, unknown> | null; duplicate?: Record<string, unknown> | null }>;

function createDependencies({ target: found = target, message: foundMessage = message, earlier = null, duplicate = null }: Overrides = {}) {
  return {
    reads: { findMessage: vi.fn().mockResolvedValue(foundMessage), findRecentDuplicate: vi.fn().mockResolvedValue(duplicate) },
    idempotency: { find: vi.fn().mockResolvedValue(earlier) },
    prospects: { findProspectContact: vi.fn().mockResolvedValue(found) },
    commands: { insertInteraction: vi.fn().mockResolvedValue("audit-1") }
  };
}
const parse = (input: Record<string, unknown>) => logInteractionInputSchema.parse({ prospectId, direction: "inbound", channel: "email", type: "reply", body: "Sounds good", ...input });
const inserted = (dependencies: ReturnType<typeof createDependencies>) => dependencies.commands.insertInteraction.mock.calls[0]?.[0] as Record<string, unknown>;

describe("logInteraction", () => {
  it("records their reply, moves the prospect to replied and marks the message it answers", async () => {
    const dependencies = createDependencies();
    const result = await logInteraction(dependencies, createActor(), parse({ outreachMessageId: messageId, responseDepth: 4, sentiment: "positive" }));

    expect(inserted(dependencies)).toMatchObject({ prospectId, outreachMessageId: messageId, type: "reply", direction: "inbound", responseDepth: 4, sentiment: "positive", newProspectStatus: "replied", newMessageReplyStatus: "replied", countsAsContact: false, contactedPersonId: null });
    expect(result).toEqual({ interactionId: expect.any(String), created: true, auditEventId: "audit-1", prospectStatus: "replied", messageReplyStatus: "replied" });
  });

  it("does not count their reply as us contacting them", async () => {
    const dependencies = createDependencies();
    await logInteraction(dependencies, createActor(), parse({}));

    expect(inserted(dependencies)).toMatchObject({ countsAsContact: false, contactedPersonId: null, newMessageReplyStatus: null });
  });

  it("counts anything we send as contact, for the person, and starts a first contact", async () => {
    const dependencies = createDependencies({ target: { ...target, status: "ready" } });
    const result = await logInteraction(dependencies, createActor(), parse({ type: "follow_up_message", direction: "outbound" }));

    expect(inserted(dependencies)).toMatchObject({ countsAsContact: true, contactedPersonId: personId, newProspectStatus: "contacted" });
    expect(result.prospectStatus).toBe("contacted");
  });

  it("refuses something we send to a do-not-contact person, but records what a flagged person sent", async () => {
    const flagged = { ...target, doNotContactAt: new Date() };
    const blocked = createDependencies({ target: flagged });
    await expect(logInteraction(blocked, createActor(), parse({ type: "follow_up_message", direction: "outbound" }))).rejects.toMatchObject({ reason: "person_do_not_contact" });
    expect(blocked.commands.insertInteraction).not.toHaveBeenCalled();

    const inbound = createDependencies({ target: flagged });
    await expect(logInteraction(inbound, createActor(), parse({}))).resolves.toMatchObject({ created: true });
  });

  it("refuses a message that belongs to another prospect, or does not exist", async () => {
    await expect(logInteraction(createDependencies({ message: { ...message, prospectId: "someone-else" } }), createActor(), parse({ outreachMessageId: messageId }))).rejects.toMatchObject({ code: "not_found", reason: "outreach_message_not_found" });
    await expect(logInteraction(createDependencies({ message: null }), createActor(), parse({ outreachMessageId: messageId }))).rejects.toMatchObject({ reason: "outreach_message_not_found" });
  });

  it("reports an unknown prospect", async () => {
    await expect(logInteraction(createDependencies({ target: null }), createActor(), parse({}))).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps what was said out of the audit trail", async () => {
    const dependencies = createDependencies();
    await logInteraction(dependencies, createActor(), parse({ body: "Very private words", subject: "Secret subject" }));

    const { audit } = inserted(dependencies) as { audit: { action: string; metadata: unknown } };
    expect(audit.action).toBe("interaction.logged");
    expect(JSON.stringify(audit)).not.toMatch(/Very private words|Secret subject/);
    expect(audit.metadata).toMatchObject({ prospectId, type: "reply", direction: "inbound", statusChange: { from: "contacted", to: "replied" } });
  });

  describe("idempotency", () => {
    it("records a key with the interaction, and leaves the duplicate window out when a key is given", async () => {
      const dependencies = createDependencies();
      await logInteraction(dependencies, createActor({ source: "mcp" }), parse({ idempotencyKey: "retry-key-001" }));

      expect(dependencies.reads.findRecentDuplicate).not.toHaveBeenCalled();
      expect(inserted(dependencies)).toMatchObject({ idempotency: expect.objectContaining({ operation: "log_interaction", source: "mcp", key: "retry-key-001" }) });
    });

    it("returns the first interaction for a repeated key with the same content, and refuses different content", async () => {
      const first = createDependencies();
      await logInteraction(first, createActor(), parse({ idempotencyKey: "retry-key-001" }));
      const { fingerprint } = (inserted(first) as { idempotency: { fingerprint: string } }).idempotency;

      const retry = createDependencies({ earlier: { fingerprint, resultEntityId: "i-first" } });
      await expect(logInteraction(retry, createActor(), parse({ idempotencyKey: "retry-key-001" }))).resolves.toMatchObject({ interactionId: "i-first", created: false, auditEventId: null });
      expect(retry.commands.insertInteraction).not.toHaveBeenCalled();

      const misuse = createDependencies({ earlier: { fingerprint: "another", resultEntityId: "i-first" } });
      await expect(logInteraction(misuse, createActor(), parse({ idempotencyKey: "retry-key-001" }))).rejects.toMatchObject({ reason: "idempotency_key_reused" });
    });

    it("treats the same thing recorded moments ago as a double submit when there is no key", async () => {
      const dependencies = createDependencies({ duplicate: { id: "i-first" } });

      await expect(logInteraction(dependencies, createActor(), parse({}))).resolves.toMatchObject({ interactionId: "i-first", created: false });
      expect(dependencies.commands.insertInteraction).not.toHaveBeenCalled();
    });
  });
});
