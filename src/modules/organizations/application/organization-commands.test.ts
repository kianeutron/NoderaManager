import { describe, expect, it, vi } from "vitest";
import { createOrganization } from "@/modules/organizations/application/create-organization.service";
import { setOrganizationDomains } from "@/modules/organizations/application/set-organization-domains.service";
import { updateOrganization } from "@/modules/organizations/application/update-organization.service";
import { createOrganizationInputSchema, setOrganizationDomainsInputSchema, updateOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";
import { createActor } from "@/test/factories/actors";

const organizationId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("createOrganization", () => {
  function createDependencies(overrides: { domainOwners?: unknown[]; similar?: unknown[] } = {}) {
    return {
      reads: { findOrganizationsByDomains: vi.fn().mockResolvedValue(overrides.domainOwners ?? []), findOrganizationsByNormalizedName: vi.fn().mockResolvedValue(overrides.similar ?? []) },
      commands: { insertOrganization: vi.fn().mockResolvedValue("audit-1") }
    };
  }
  const parse = (fields: Record<string, unknown> = {}) => createOrganizationInputSchema.parse({ name: "Blue Wave", ...fields });

  it("creates the organization with its domains (first canonical) and normalized name", async () => {
    const dependencies = createDependencies();
    const result = await createOrganization(dependencies, createActor(), parse({ domains: ["https://www.bluewave.io", "wave.co"], countryCode: "de", organizationType: "agency" }));

    expect(dependencies.reads.findOrganizationsByDomains).toHaveBeenCalledWith(["bluewave.io", "wave.co"]);
    const draft = dependencies.commands.insertOrganization.mock.calls[0]?.[0];
    expect(draft).toMatchObject({ name: "Blue Wave", normalizedName: "blue wave", organizationType: "agency", countryCode: "DE", domains: ["bluewave.io", "wave.co"], audit: { action: "organization.created", actorType: "mcp" } });
    expect(result).toEqual({ organizationId: draft.organizationId, created: true, auditEventId: "audit-1", similarOrganizations: [] });
  });

  it("blocks creation when a domain already belongs to an organization, naming it", async () => {
    const dependencies = createDependencies({ domainOwners: [{ organizationId: "org-9", name: "Bluewave Studio", domain: "bluewave.io" }] });

    await expect(createOrganization(dependencies, createActor(), parse({ domains: ["bluewave.io"] }))).rejects.toThrow('The domain bluewave.io already belongs to "Bluewave Studio" (organization org-9)');
    expect(dependencies.commands.insertOrganization).not.toHaveBeenCalled();
  });

  it("only reports a same-name organization as advisory, never blocking or merging on the name", async () => {
    const dependencies = createDependencies({ similar: [{ organizationId: "org-2", name: "Blue Wave" }] });
    const result = await createOrganization(dependencies, createActor(), parse());

    expect(result.similarOrganizations).toEqual([{ organizationId: "org-2", name: "Blue Wave" }]);
    expect(dependencies.commands.insertOrganization).toHaveBeenCalledOnce();
  });
});

describe("updateOrganization", () => {
  const current = { id: organizationId, name: "Blue Wave", organizationType: "company", sizeBand: null, websiteUrl: null, linkedinUrl: null, countryCode: "DE", industry: "SaaS", notes: "Private context" };
  const dependencies = () => ({ reads: { findOrganization: vi.fn().mockResolvedValue(current) }, commands: { updateOrganization: vi.fn().mockResolvedValue("audit-1") } });
  const parse = (fields: Record<string, unknown>) => updateOrganizationInputSchema.parse({ organizationId, ...fields });

  it("writes only what differs, recomputes the normalized name and keeps the notes text out of the audit trail", async () => {
    const deps = dependencies();
    await updateOrganization(deps, createActor(), parse({ name: "Blue  Wave Studio", industry: "SaaS", notes: "New private context" }));

    expect(deps.commands.updateOrganization).toHaveBeenCalledWith(organizationId, { name: "Blue Wave Studio", normalizedName: "blue wave studio", notes: "New private context" }, expect.objectContaining({ action: "organization.updated", metadata: { fields: ["name", "notes"], before: { name: "Blue Wave" }, after: { name: "Blue Wave Studio" } } }));
    expect(JSON.stringify(deps.commands.updateOrganization.mock.calls[0]?.[2])).not.toContain("private context");
  });

  it("is a silent no-op when nothing differs, and clears with null", async () => {
    const noop = dependencies();
    expect(await updateOrganization(noop, createActor(), parse({ countryCode: "DE" }))).toEqual({ organizationId, changed: false, auditEventId: null });
    expect(noop.commands.updateOrganization).not.toHaveBeenCalled();

    const clear = dependencies();
    await updateOrganization(clear, createActor(), parse({ industry: null }));
    expect(clear.commands.updateOrganization).toHaveBeenCalledWith(organizationId, { industry: null }, expect.anything());
  });

  it("reports an unknown organization", async () => {
    const deps = dependencies();
    deps.reads.findOrganization.mockResolvedValue(null);

    await expect(updateOrganization(deps, createActor(), parse({ industry: "Fintech" }))).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("setOrganizationDomains", () => {
  const dependencies = (currentDomains: string[], owners: { organizationId: string; name: string; domain: string }[] = []) => ({
    reads: {
      findOrganization: vi.fn().mockResolvedValue({ id: organizationId, name: "Blue Wave" }),
      listDomains: vi.fn().mockResolvedValue(currentDomains.map((domain, index) => ({ domain, isCanonical: index === 0 }))),
      findOrganizationsByDomains: vi.fn().mockResolvedValue(owners)
    },
    commands: { replaceDomains: vi.fn().mockResolvedValue("audit-1") }
  });
  const parse = (domains: string[]) => setOrganizationDomainsInputSchema.parse({ organizationId, domains });

  it("replaces the set with the first domain canonical", async () => {
    const deps = dependencies(["old.io"]);
    const result = await setOrganizationDomains(deps, createActor(), parse(["New.io", "second.io"]));

    expect(deps.commands.replaceDomains).toHaveBeenCalledWith(organizationId, ["new.io", "second.io"], expect.objectContaining({ action: "organization.domains_set", metadata: { before: ["old.io"], after: ["new.io", "second.io"] } }));
    expect(result).toMatchObject({ domains: ["new.io", "second.io"], changed: true });
  });

  it("is a no-op for the same domains in the same order, but not when the canonical one changes", async () => {
    const same = dependencies(["a.io", "b.io"]);
    expect(await setOrganizationDomains(same, createActor(), parse(["a.io", "b.io"]))).toMatchObject({ changed: false, auditEventId: null });
    expect(same.commands.replaceDomains).not.toHaveBeenCalled();

    const reordered = dependencies(["a.io", "b.io"]);
    await setOrganizationDomains(reordered, createActor(), parse(["b.io", "a.io"]));
    expect(reordered.commands.replaceDomains).toHaveBeenCalled();
  });

  it("refuses a domain another organization owns, but not the organization's own", async () => {
    const stolen = dependencies([], [{ organizationId: "org-9", name: "Other Co", domain: "other.io" }]);
    await expect(setOrganizationDomains(stolen, createActor(), parse(["other.io"]))).rejects.toThrow('belongs to "Other Co" (organization org-9)');

    const own = dependencies(["mine.io"], [{ organizationId, name: "Blue Wave", domain: "mine.io" }]);
    expect(await setOrganizationDomains(own, createActor(), parse(["mine.io"]))).toMatchObject({ changed: false });
  });
});
