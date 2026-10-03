import { describe, expect, it, vi } from "vitest";
import { logOutreach } from "@/modules/outreach/application/log-outreach.service";
import { logOutreachInputSchema } from "@/modules/outreach/domain/outreach.schema";
import { createActor } from "@/test/factories/actors";

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const organizationId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d92";
const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d93";

const target = {
  prospectId, status: "ready", archivedAt: null, routeId, routeModuleId: null,
  personId, personExists: personId, personArchivedAt: null, doNotContactAt: null,
  organizationId, organizationExists: organizationId, organizationArchivedAt: null
};

type Overrides = Readonly<{ target?: Record<string, unknown> | null; earlier?: Record<string, unknown> | null; duplicate?: Record<string, unknown> | null; membership?: Record<string, unknown> | null }>;

function createDependencies({ target: found = target, earlier = null, duplicate = null, membership = { status: "active", archivedAt: null, isMember: true } }: Overrides = {}) {
  return {
    reads: { findRecentDuplicate: vi.fn().mockResolvedValue(duplicate) },
    idempotency: { find: vi.fn().mockResolvedValue(earlier) },
    prospects: { findProspectContact: vi.fn().mockResolvedValue(found) },
    campaigns: { findMembership: vi.fn().mockResolvedValue(membership) },
    commands: { insertMessage: vi.fn().mockResolvedValue("audit-1") }
  };
}
const parse = (input: Record<string, unknown>) => logOutreachInputSchema.parse({ prospectId, channel: "email", body: "Hi Marta", ...input });

describe("logOutreach", () => {
  it("files the message under the prospect's own person, organization and route", async () => {
    const dependencies = createDependencies();
    const result = await logOutreach(dependencies, createActor(), parse({ subject: "Hello" }));

    expect(dependencies.commands.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ prospectId, personId, organizationId, routeId, channel: "email", subject: "Hello", body: "Hi Marta" }));
    expect(result).toEqual({ messageId: expect.any(String), created: true, auditEventId: "audit-1", prospectStatus: "contacted" });
  });

  it("moves a ready prospect to contacted, but leaves a later status alone", async () => {
    const first = createDependencies();
    await logOutreach(first, createActor(), parse({}));
    expect(first.commands.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ newProspectStatus: "contacted" }));

    const warm = createDependencies({ target: { ...target, status: "warm" } });
    const result = await logOutreach(warm, createActor(), parse({}));
    expect(warm.commands.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ newProspectStatus: null }));
    expect(result.prospectStatus).toBe("warm");
  });

  it("keeps the message text out of the audit trail", async () => {
    const dependencies = createDependencies();
    await logOutreach(dependencies, createActor(), parse({ body: "Very private words", subject: "Secret subject" }));

    const { audit } = dependencies.commands.insertMessage.mock.calls[0]?.[0] as { audit: { action: string; metadata: unknown } };
    expect(audit.action).toBe("outreach.logged");
    expect(JSON.stringify(audit)).not.toMatch(/Very private words|Secret subject/);
    expect(audit.metadata).toMatchObject({ prospectId, channel: "email", hasSubject: true, statusChange: { from: "ready", to: "contacted" } });
  });

  it("refuses a do-not-contact person and writes nothing", async () => {
    const dependencies = createDependencies({ target: { ...target, doNotContactAt: new Date() } });

    await expect(logOutreach(dependencies, createActor(), parse({}))).rejects.toMatchObject({ code: "conflict", reason: "person_do_not_contact" });
    expect(dependencies.commands.insertMessage).not.toHaveBeenCalled();
  });

  it("reports an unknown prospect", async () => {
    const dependencies = createDependencies({ target: null });
    await expect(logOutreach(dependencies, createActor(), parse({}))).rejects.toMatchObject({ code: "not_found" });
  });

  describe("idempotency", () => {
    it("records a key with the message so a retry can be recognised", async () => {
      const dependencies = createDependencies();
      await logOutreach(dependencies, createActor({ source: "mcp" }), parse({ idempotencyKey: "retry-key-001" }));

      expect(dependencies.reads.findRecentDuplicate).not.toHaveBeenCalled();
      expect(dependencies.commands.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ idempotency: expect.objectContaining({ operation: "log_outreach", source: "mcp", key: "retry-key-001", fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/) }) }));
    });

    it("returns the first message for a repeated key with the same text", async () => {
      const first = createDependencies();
      await logOutreach(first, createActor(), parse({ idempotencyKey: "retry-key-001" }));
      const { fingerprint } = (first.commands.insertMessage.mock.calls[0]?.[0] as { idempotency: { fingerprint: string } }).idempotency;

      const retry = createDependencies({ earlier: { fingerprint, resultEntityId: "m-first" } });
      const result = await logOutreach(retry, createActor(), parse({ idempotencyKey: "retry-key-001" }));

      expect(result).toEqual({ messageId: "m-first", created: false, auditEventId: null, prospectStatus: "ready" });
      expect(retry.commands.insertMessage).not.toHaveBeenCalled();
    });

    it("refuses a key reused for a different message", async () => {
      const dependencies = createDependencies({ earlier: { fingerprint: "another", resultEntityId: "m-first" } });

      await expect(logOutreach(dependencies, createActor(), parse({ idempotencyKey: "retry-key-001" }))).rejects.toMatchObject({ code: "conflict", reason: "idempotency_key_reused" });
    });

    it("treats identical text sent moments ago as a double submit when there is no key", async () => {
      const dependencies = createDependencies({ duplicate: { id: "m-first" } });
      const result = await logOutreach(dependencies, createActor(), parse({}));

      expect(result).toMatchObject({ messageId: "m-first", created: false, auditEventId: null });
      expect(dependencies.commands.insertMessage).not.toHaveBeenCalled();
    });

    it("returns the original even if the prospect has since been closed", async () => {
      const dependencies = createDependencies({ target: { ...target, status: "won" }, duplicate: { id: "m-first" } });
      await expect(logOutreach(dependencies, createActor(), parse({}))).resolves.toMatchObject({ created: false });
    });
  });

  describe("under a campaign", () => {
    const campaignId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d94";

    it("files the message under the campaign when the prospect is a member of an active one", async () => {
      const dependencies = createDependencies();
      await logOutreach(dependencies, createActor(), parse({ campaignId }));

      expect(dependencies.campaigns.findMembership).toHaveBeenCalledWith(campaignId, prospectId);
      expect(dependencies.commands.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ campaignId }));
    });

    it("never asks about campaigns when none is given", async () => {
      const dependencies = createDependencies();
      await logOutreach(dependencies, createActor(), parse({}));

      expect(dependencies.campaigns.findMembership).not.toHaveBeenCalled();
      expect(dependencies.commands.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ campaignId: null }));
    });

    it.each([
      ["an unknown campaign", null, "campaign_not_found"],
      ["an archived campaign", { status: "active", archivedAt: new Date(), isMember: true }, "campaign_not_found"],
      ["a campaign the prospect is not in", { status: "active", archivedAt: null, isMember: false }, "prospect_not_in_campaign"],
      ["a draft campaign", { status: "draft", archivedAt: null, isMember: true }, "campaign_not_active"],
      ["a paused campaign", { status: "paused", archivedAt: null, isMember: true }, "campaign_not_active"],
      ["a completed campaign", { status: "completed", archivedAt: null, isMember: true }, "campaign_not_active"]
    ])("refuses %s and writes nothing", async (_case, membership, reason) => {
      const dependencies = createDependencies({ membership });

      await expect(logOutreach(dependencies, createActor(), parse({ campaignId }))).rejects.toMatchObject({ reason });
      expect(dependencies.commands.insertMessage).not.toHaveBeenCalled();
    });
  });
});
