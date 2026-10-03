import { describe, expect, it } from "vitest";
import { createOrganizationInputSchema, organizationSearchQuerySchema, setOrganizationDomainsInputSchema, updateOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("organization command schemas", () => {
  it("normalizes domains, keeps the caller's order (first is canonical) and drops repeats", () => {
    const input = createOrganizationInputSchema.parse({ name: "  Blue   Wave ", domains: ["https://www.Bluewave.io/team", "wave.co", "bluewave.io"], countryCode: "de" });

    expect(input).toMatchObject({ name: "Blue Wave", organizationType: "company", countryCode: "DE", domains: ["bluewave.io", "wave.co"] });
  });

  it.each([
    [{ name: "Acme", domains: ["not a domain"] }],
    [{ name: "Acme", domains: Array.from({ length: 11 }, (_, index) => `d${index}.io`) }],
    [{ name: "Acme", organizationType: "startup" }],
    [{ name: "Acme", websiteUrl: "javascript:alert(1)" }],
    [{ name: "Acme", linkedinUrl: "https://example.com/company/acme" }],
    [{ name: "Acme", sizeBand: "huge" }],
    [{ name: "", domains: [] }]
  ])("rejects %o", (input) => {
    expect(createOrganizationInputSchema.safeParse(input).success).toBe(false);
  });

  it("requires an update to change something and lets null clear optional fields", () => {
    expect(updateOrganizationInputSchema.safeParse({ organizationId: id }).success).toBe(false);
    expect(updateOrganizationInputSchema.parse({ organizationId: id, sizeBand: null, notes: null })).toEqual({ organizationId: id, sizeBand: null, notes: null });
  });

  it("accepts an empty domain list to clear domains", () => {
    expect(setOrganizationDomainsInputSchema.parse({ organizationId: id, domains: [] }).domains).toEqual([]);
  });

  it("bounds searches", () => {
    expect(organizationSearchQuerySchema.parse({})).toEqual({ scope: "active", sort: "updated", limit: 25 });
    expect(organizationSearchQuerySchema.safeParse({ countryCode: "DEU" }).success).toBe(false);
  });
});
