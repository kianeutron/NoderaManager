import { describe, expect, it, vi } from "vitest";
import { createPerson } from "@/modules/people/application/create-person.service";
import type { IdentityMatchRow } from "@/modules/people/domain/duplicate-candidates";
import { createPersonInputSchema } from "@/modules/people/domain/person.schema";
import { createActor } from "@/test/factories/actors";

const organizationId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d01";

function match(overrides: Partial<IdentityMatchRow> = {}): IdentityMatchRow {
  return { personId: "existing-1", fullName: "Marta Chen", normalizedName: "marta chen", normalizedLinkedinUrl: null, organizationId: null, organizationName: null, normalizedEmails: [], organizationDomains: [], ...overrides };
}

function createDependencies(matches: IdentityMatchRow[] = [], organization: unknown = { id: organizationId }) {
  return {
    reads: { findIdentityMatches: vi.fn().mockResolvedValue(matches) },
    organizations: { findOrganization: vi.fn().mockResolvedValue(organization) },
    commands: { insertPerson: vi.fn().mockResolvedValue("audit-1") }
  };
}

const parse = (fields: Record<string, unknown>) => createPersonInputSchema.parse({ fullName: "Marta Chen", ...fields });

describe("createPerson", () => {
  it("creates a person with normalized keys, a primary email and an audit event that holds no contact details", async () => {
    const dependencies = createDependencies();
    const result = await createPerson(dependencies, createActor(), parse({ emails: ["Marta@Bluewave.io", "m@x.io"], linkedinUrl: "https://www.linkedin.com/in/Marta-Chen/", organizationId, persona: "recruiter", countryCode: "de" }));

    const draft = dependencies.commands.insertPerson.mock.calls[0]?.[0];
    expect(draft).toMatchObject({ fullName: "Marta Chen", normalizedName: "marta chen", normalizedLinkedinUrl: "https://linkedin.com/in/marta-chen", organizationId, persona: "recruiter", countryCode: "DE" });
    expect(draft.emails).toEqual([{ email: "Marta@Bluewave.io", normalizedEmail: "marta@bluewave.io", isPrimary: true }, { email: "m@x.io", normalizedEmail: "m@x.io", isPrimary: false }]);
    expect(draft.audit).toMatchObject({ action: "person.created", entityId: draft.personId, actorType: "mcp" });
    expect(JSON.stringify(draft.audit)).not.toMatch(/bluewave|m@x\.io|in\/marta/i);
    expect(result).toEqual({ personId: draft.personId, created: true, auditEventId: "audit-1", possibleDuplicates: [] });
  });

  it("checks for duplicates with every identifier it was given", async () => {
    const dependencies = createDependencies();
    await createPerson(dependencies, createActor(), parse({ emails: ["a@x.io"], linkedinUrl: "https://linkedin.com/in/marta", organizationId }));

    expect(dependencies.reads.findIdentityMatches).toHaveBeenCalledWith({ normalizedName: "marta chen", normalizedEmails: ["a@x.io"], normalizedLinkedInUrl: "https://linkedin.com/in/marta", organizationId });
  });

  it("blocks creation on an exact match and names the existing person", async () => {
    const dependencies = createDependencies([match({ normalizedEmails: ["a@x.io"] })]);

    await expect(createPerson(dependencies, createActor(), parse({ emails: ["A@x.io"] }))).rejects.toThrow('"Marta Chen" (person existing-1) already exists (matching normalized email)');
    expect(dependencies.commands.insertPerson).not.toHaveBeenCalled();
  });

  it("blocks creation on a strong match unless the caller confirms a new identity", async () => {
    const strong = match({ organizationId });
    const blocked = createDependencies([strong]);
    await expect(createPerson(blocked, createActor(), parse({ organizationId }))).rejects.toThrow("confirmNewIdentity: true");
    expect(blocked.commands.insertPerson).not.toHaveBeenCalled();

    const confirmed = createDependencies([strong]);
    const result = await createPerson(confirmed, createActor(), parse({ organizationId, confirmNewIdentity: true }));
    expect(result.possibleDuplicates).toMatchObject([{ personId: "existing-1", matchLevel: "strong" }]);
    expect(confirmed.commands.insertPerson.mock.calls[0]?.[0].audit.metadata).toMatchObject({ confirmedNewIdentity: true });
  });

  it("creates the person anyway on a weak match and reports it", async () => {
    const dependencies = createDependencies([match({ organizationId: "another-org" })]);
    const result = await createPerson(dependencies, createActor(), parse({ organizationId }));

    expect(result.possibleDuplicates).toMatchObject([{ matchLevel: "weak" }]);
    expect(dependencies.commands.insertPerson).toHaveBeenCalledOnce();
  });

  it("refuses an unknown organization before checking for duplicates", async () => {
    const dependencies = createDependencies([], null);

    await expect(createPerson(dependencies, createActor(), parse({ organizationId }))).rejects.toMatchObject({ code: "not_found" });
    expect(dependencies.reads.findIdentityMatches).not.toHaveBeenCalled();
  });
});
