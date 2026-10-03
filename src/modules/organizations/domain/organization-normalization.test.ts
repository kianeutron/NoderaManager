import { describe, expect, it } from "vitest";
import { dedupeDomains, normalizeOrganizationDomain, organizationDomainSchema } from "@/modules/organizations/domain/organization-normalization";

describe("organization domain normalization", () => {
  it("reduces URLs and bare domains to a lowercase host without www", () => {
    expect(normalizeOrganizationDomain("https://www.Bluewave.io/some/path")).toBe("bluewave.io");
    expect(normalizeOrganizationDomain("Bluewave.IO")).toBe("bluewave.io");
  });

  it("validates caller input into canonical domains and rejects non-domains", () => {
    expect(organizationDomainSchema.parse(" https://WWW.Acme.co.uk/team ")).toBe("acme.co.uk");
    for (const invalid of ["localhost", "not a domain", "https://", "x", "a..b"]) expect(organizationDomainSchema.safeParse(invalid).success, invalid).toBe(false);
  });

  it("keeps the first spelling order when removing repeats", () => {
    expect(dedupeDomains(["a.io", "b.io", "a.io"])).toEqual(["a.io", "b.io"]);
  });
});
