import { describe, expect, it, vi } from "vitest";
import { createFollowUp } from "@/modules/followups/application/create-followup.service";
import { createFollowUpInputSchema } from "@/modules/followups/domain/followup.schema";
import { createActor } from "@/test/factories/actors";

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const messageId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d92";
const target = { prospectId, status: "contacted", archivedAt: null, personId: "p1", personExists: "p1", personArchivedAt: null, doNotContactAt: null, organizationId: null, organizationExists: null, organizationArchivedAt: null };

type Overrides = Readonly<{ target?: Record<string, unknown> | null; existing?: Record<string, unknown> | null; messageProspect?: string | null; interactionProspect?: string | null }>;

function createDependencies({ target: found = target, existing = null, messageProspect = prospectId, interactionProspect = prospectId }: Overrides = {}) {
  return {
    reads: { findOpenByReason: vi.fn().mockResolvedValue(existing), findMessageProspect: vi.fn().mockResolvedValue(messageProspect), findInteractionProspect: vi.fn().mockResolvedValue(interactionProspect) },
    prospects: { findProspectContact: vi.fn().mockResolvedValue(found) },
    commands: { insertFollowUp: vi.fn().mockResolvedValue("audit-1") }
  };
}
const parse = (input: Record<string, unknown>) => createFollowUpInputSchema.parse({ prospectId, reason: "Ask about Q1 budget", ...input });

describe("createFollowUp", () => {
  it("creates a follow-up with its dates and channel, and audits it without the reason", async () => {
    const dependencies = createDependencies();
    const result = await createFollowUp(dependencies, createActor(), parse({ dueAt: "2026-11-01T00:00:00Z", suggestedChannel: "email", reason: "Private plan" }));

    expect(dependencies.commands.insertFollowUp).toHaveBeenCalledWith(expect.objectContaining({ prospectId, reason: "Private plan", dueAt: new Date("2026-11-01T00:00:00Z"), notBeforeAt: null, suggestedChannel: "email" }));
    expect(result).toEqual({ followUpId: expect.any(String), created: true, auditEventId: "audit-1" });
    const { audit } = dependencies.commands.insertFollowUp.mock.calls[0]?.[0] as { audit: { action: string } };
    expect(audit.action).toBe("follow_up.created");
    expect(JSON.stringify(audit)).not.toContain("Private plan");
  });

  it("returns the open follow-up with the same reason instead of adding a second, before any other check", async () => {
    const dependencies = createDependencies({ existing: { id: "f-first" } });

    await expect(createFollowUp(dependencies, createActor(), parse({}))).resolves.toEqual({ followUpId: "f-first", created: false, auditEventId: null });
    expect(dependencies.commands.insertFollowUp).not.toHaveBeenCalled();
    expect(dependencies.reads.findOpenByReason).toHaveBeenCalledWith(prospectId, "Ask about Q1 budget");
  });

  it("follows the rules for contacting someone: not for do-not-contact, closed or archived", async () => {
    await expect(createFollowUp(createDependencies({ target: { ...target, doNotContactAt: new Date() } }), createActor(), parse({}))).rejects.toMatchObject({ reason: "person_do_not_contact" });
    await expect(createFollowUp(createDependencies({ target: { ...target, status: "lost" } }), createActor(), parse({}))).rejects.toMatchObject({ reason: "prospect_closed" });
    await expect(createFollowUp(createDependencies({ target: { ...target, personArchivedAt: new Date() } }), createActor(), parse({}))).rejects.toMatchObject({ reason: "contact_archived" });
  });

  it("reports an unknown prospect", async () => {
    await expect(createFollowUp(createDependencies({ target: null }), createActor(), parse({}))).rejects.toMatchObject({ code: "not_found" });
  });

  it("accepts an origin that belongs to the same prospect and refuses one that does not", async () => {
    await expect(createFollowUp(createDependencies(), createActor(), parse({ originOutreachMessageId: messageId }))).resolves.toMatchObject({ created: true });
    await expect(createFollowUp(createDependencies({ messageProspect: "someone-else" }), createActor(), parse({ originOutreachMessageId: messageId }))).rejects.toMatchObject({ reason: "outreach_message_not_found" });
    await expect(createFollowUp(createDependencies({ interactionProspect: null }), createActor(), parse({ originInteractionId: messageId }))).rejects.toMatchObject({ reason: "interaction_not_found" });
  });
});
