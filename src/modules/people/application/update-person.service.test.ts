import { describe, expect, it, vi } from "vitest";
import { updatePerson } from "@/modules/people/application/update-person.service";
import { updatePersonInputSchema } from "@/modules/people/domain/person.schema";
import { createActor } from "@/test/factories/actors";

const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const organizationId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d01";
const current = { id: personId, fullName: "Marta Chen", role: "CTO", persona: null, organizationId: null, linkedinUrl: null, countryCode: "DE", city: "Berlin", languages: ["en", "de"] };

function createDependencies(overrides: { organization?: unknown; linkedinOwner?: unknown } = {}) {
  return {
    reads: { findPerson: vi.fn().mockResolvedValue(current), findPersonByLinkedin: vi.fn().mockResolvedValue(overrides.linkedinOwner ?? null) },
    organizations: { findOrganization: vi.fn().mockResolvedValue("organization" in overrides ? overrides.organization : { id: organizationId }) },
    commands: { updatePerson: vi.fn().mockResolvedValue("audit-1") }
  };
}

const parse = (fields: Record<string, unknown>) => updatePersonInputSchema.parse({ personId, ...fields });

describe("updatePerson", () => {
  it("writes only what differs and recomputes normalized keys for renamed identities", async () => {
    const dependencies = createDependencies();
    const result = await updatePerson(dependencies, createActor(), parse({ fullName: "Marta  Chen-Ortiz", role: "CTO", linkedinUrl: "https://www.linkedin.com/in/Marta/" }));

    expect(dependencies.commands.updatePerson).toHaveBeenCalledWith(personId, { fullName: "Marta Chen-Ortiz", normalizedName: "marta chen-ortiz", linkedinUrl: "https://www.linkedin.com/in/Marta/", normalizedLinkedinUrl: "https://linkedin.com/in/marta" }, expect.objectContaining({ action: "person.updated", metadata: expect.objectContaining({ fields: ["fullName", "linkedinUrl"] }) }));
    expect(result).toEqual({ personId, changed: true, auditEventId: "audit-1" });
  });

  it("is a silent no-op when nothing differs, treating languages as an unordered set", async () => {
    const dependencies = createDependencies();
    const result = await updatePerson(dependencies, createActor(), parse({ role: "CTO", languages: ["de", "en"] }));

    expect(result).toEqual({ personId, changed: false, auditEventId: null });
    expect(dependencies.commands.updatePerson).not.toHaveBeenCalled();
  });

  it("updates languages when the set differs", async () => {
    const dependencies = createDependencies();
    await updatePerson(dependencies, createActor(), parse({ languages: ["en"] }));

    expect(dependencies.commands.updatePerson).toHaveBeenCalledWith(personId, { languages: ["en"] }, expect.anything());
  });

  it("clears an optional field with null and clears the LinkedIn identity with it", async () => {
    const dependencies = createDependencies();
    dependencies.reads.findPerson.mockResolvedValue({ ...current, linkedinUrl: "https://linkedin.com/in/marta" });
    await updatePerson(dependencies, createActor(), parse({ role: null, linkedinUrl: null }));

    expect(dependencies.commands.updatePerson).toHaveBeenCalledWith(personId, { role: null, linkedinUrl: null, normalizedLinkedinUrl: null }, expect.anything());
  });

  it("refuses a LinkedIn profile that belongs to someone else, but allows the person's own", async () => {
    const stolen = createDependencies({ linkedinOwner: { id: "someone-else", fullName: "Julian Park" } });
    await expect(updatePerson(stolen, createActor(), parse({ linkedinUrl: "https://linkedin.com/in/julian" }))).rejects.toThrow('belongs to "Julian Park" (person someone-else)');
    expect(stolen.commands.updatePerson).not.toHaveBeenCalled();

    const own = createDependencies({ linkedinOwner: { id: personId, fullName: "Marta Chen" } });
    await updatePerson(own, createActor(), parse({ linkedinUrl: "https://linkedin.com/in/marta" }));
    expect(own.commands.updatePerson).toHaveBeenCalled();
  });

  it("refuses an unknown person and an unknown organization", async () => {
    const missingPerson = createDependencies();
    missingPerson.reads.findPerson.mockResolvedValue(null);
    await expect(updatePerson(missingPerson, createActor(), parse({ role: "CEO" }))).rejects.toMatchObject({ code: "not_found" });

    await expect(updatePerson(createDependencies({ organization: null }), createActor(), parse({ organizationId }))).rejects.toThrow("Organization not found");
  });
});
