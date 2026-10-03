import { describe, expect, it } from "vitest";
import { classifyCandidates, getDuplicateLookupKeys, type IdentityMatchRow } from "@/modules/people/domain/duplicate-candidates";

const organizationId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d01";

function row(overrides: Partial<IdentityMatchRow> = {}): IdentityMatchRow {
  return { personId: "p1", fullName: "Marta Chen", normalizedName: "marta chen", normalizedLinkedinUrl: null, organizationId: null, organizationName: null, normalizedEmails: [], organizationDomains: [], ...overrides };
}

describe("getDuplicateLookupKeys", () => {
  it("normalizes every identifying field and merges single and multiple emails", () => {
    expect(getDuplicateLookupKeys({ fullName: "  Mårta   CHEN ", email: "A@X.io", emails: ["a@x.io", "B@X.io"], linkedInUrl: "https://www.linkedin.com/in/Marta/", organizationDomain: "https://www.Acme.io/team" })).toEqual({
      normalizedName: "mårta chen",
      normalizedEmails: ["a@x.io", "b@x.io"],
      normalizedLinkedInUrl: "https://linkedin.com/in/marta",
      organizationDomain: "acme.io"
    });
  });

  it("leaves out identifiers that were not given", () => {
    expect(getDuplicateLookupKeys({ fullName: "Marta Chen" })).toEqual({ normalizedName: "marta chen", normalizedEmails: [] });
  });
});

describe("classifyCandidates", () => {
  const lookup = getDuplicateLookupKeys({ fullName: "Marta Chen", emails: ["marta@bluewave.io"], organizationId });

  it("treats a shared email as an exact match, whatever the name", () => {
    const [candidate] = classifyCandidates([row({ fullName: "M. Chen", normalizedName: "m. chen", normalizedEmails: ["marta@bluewave.io"] })], lookup);

    expect(candidate).toMatchObject({ matchLevel: "exact", reason: "Matching normalized email" });
  });

  it("treats a shared LinkedIn profile as an exact match", () => {
    const withLinkedIn = getDuplicateLookupKeys({ fullName: "Someone Else", linkedInUrl: "https://linkedin.com/in/marta" });
    const [candidate] = classifyCandidates([row({ normalizedLinkedinUrl: "https://linkedin.com/in/marta" })], withLinkedIn);

    expect(candidate).toMatchObject({ matchLevel: "exact", reason: "Matching LinkedIn profile" });
  });

  it("treats the same name in the same organization, or on the same domain, as strong", () => {
    expect(classifyCandidates([row({ organizationId })], lookup)[0]).toMatchObject({ matchLevel: "strong", reason: "Matching name and organization" });

    const byDomain = getDuplicateLookupKeys({ fullName: "Marta Chen", organizationDomain: "bluewave.io" });
    expect(classifyCandidates([row({ organizationDomains: ["bluewave.io"] })], byDomain)[0]).toMatchObject({ matchLevel: "strong", reason: "Matching name and organization domain" });
  });

  it("never treats a name alone as more than weak", () => {
    const [candidate] = classifyCandidates([row({ organizationId: "another-org" })], lookup);

    expect(candidate).toMatchObject({ matchLevel: "weak", reason: "Similar name" });
  });

  it("returns one candidate per person, strongest first", () => {
    const candidates = classifyCandidates([
      row({ personId: "weak", fullName: "Zed" }),
      row({ personId: "exact", fullName: "Ann", normalizedEmails: ["marta@bluewave.io"] }),
      row({ personId: "strong", organizationId })
    ], lookup);

    expect(candidates.map((candidate) => candidate.personId)).toEqual(["exact", "strong", "weak"]);
  });
});
