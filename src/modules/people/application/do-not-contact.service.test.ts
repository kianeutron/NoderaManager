import { describe, expect, it, vi } from "vitest";
import { clearPersonDoNotContact, markPersonDoNotContact } from "@/modules/people/application/do-not-contact.service";
import { createActor } from "@/test/factories/actors";

const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const flaggedAt = new Date("2026-09-01T10:00:00Z");

function createDependencies(person: Record<string, unknown> | null) {
  return { reads: { findPerson: vi.fn().mockResolvedValue(person) }, commands: { setDoNotContact: vi.fn().mockResolvedValue("audit-1") } };
}

const open = { id: personId, fullName: "Marta Chen", doNotContactAt: null, doNotContactReason: null };
const flagged = { ...open, doNotContactAt: flaggedAt, doNotContactReason: "Asked to stop" };

describe("markPersonDoNotContact", () => {
  it("flags the person with the reason and audits it", async () => {
    const dependencies = createDependencies(open);
    const result = await markPersonDoNotContact(dependencies, createActor(), { personId, reason: "Asked to stop" });

    expect(dependencies.commands.setDoNotContact).toHaveBeenCalledWith(personId, { at: expect.any(Date), reason: "Asked to stop" }, expect.objectContaining({ action: "person.do_not_contact_set", metadata: { reason: "Asked to stop" } }));
    expect(result).toEqual({ personId, doNotContact: true, changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op for the same reason, and keeps the original date when the reason changes", async () => {
    const same = createDependencies(flagged);
    expect(await markPersonDoNotContact(same, createActor(), { personId, reason: "Asked to stop" })).toMatchObject({ changed: false, auditEventId: null });
    expect(same.commands.setDoNotContact).not.toHaveBeenCalled();

    const updated = createDependencies(flagged);
    await markPersonDoNotContact(updated, createActor(), { personId, reason: "Left the company" });
    expect(updated.commands.setDoNotContact).toHaveBeenCalledWith(personId, { at: flaggedAt, reason: "Left the company" }, expect.anything());
  });

  it("reports an unknown person", async () => {
    await expect(markPersonDoNotContact(createDependencies(null), createActor(), { personId, reason: "x" })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("clearPersonDoNotContact", () => {
  it("clears the flag and keeps the old reason in the audit trail", async () => {
    const dependencies = createDependencies(flagged);
    const result = await clearPersonDoNotContact(dependencies, createActor(), { personId });

    expect(dependencies.commands.setDoNotContact).toHaveBeenCalledWith(personId, { at: null, reason: null }, expect.objectContaining({ action: "person.do_not_contact_cleared", metadata: { previousReason: "Asked to stop" } }));
    expect(result).toEqual({ personId, doNotContact: false, changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when the person is not flagged", async () => {
    const dependencies = createDependencies(open);

    expect(await clearPersonDoNotContact(dependencies, createActor(), { personId })).toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.commands.setDoNotContact).not.toHaveBeenCalled();
  });
});
