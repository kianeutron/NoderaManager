import { describe, expect, it } from "vitest";
import { createPersonInputSchema, personIdentitySchema, personSearchQuerySchema, setPersonEmailsInputSchema, setPersonLinksInputSchema, updatePersonInputSchema } from "@/modules/people/domain/person.schema";

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("person command schemas", () => {
  it("normalizes a new person's fields and applies defaults", () => {
    expect(createPersonInputSchema.parse({ fullName: "  Marta   Chen ", countryCode: "de", languages: ["EN", "en", "de"], emails: ["A@x.io", "a@X.io", "b@x.io"] })).toEqual({
      fullName: "Marta Chen", countryCode: "DE", languages: ["en", "de"], emails: ["A@x.io", "b@x.io"], confirmNewIdentity: false
    });
  });

  it.each([
    [{ fullName: "" }],
    [{ fullName: "Marta", emails: ["nope"] }],
    [{ fullName: "Marta", emails: Array.from({ length: 11 }, (_, index) => `p${index}@x.io`) }],
    [{ fullName: "Marta", languages: ["english"] }],
    [{ fullName: "Marta", countryCode: "Germany" }],
    [{ fullName: "Marta", linkedinUrl: "https://example.com/in/marta" }],
    [{ fullName: "Marta", persona: "wizard" }],
    [{ fullName: "Marta", createdBy: "someone" }]
  ])("rejects %o", (input) => {
    expect(createPersonInputSchema.safeParse(input).success).toBe(false);
  });

  it("requires an update to change something, and lets null clear optional fields", () => {
    expect(updatePersonInputSchema.safeParse({ personId: id }).success).toBe(false);
    expect(updatePersonInputSchema.parse({ personId: id, role: null, organizationId: null, persona: null })).toEqual({ personId: id, role: null, organizationId: null, persona: null });
  });

  it("treats the first email as primary and drops case-insensitive repeats", () => {
    expect(setPersonEmailsInputSchema.parse({ personId: id, emails: ["First@x.io", "second@x.io", "first@X.io"] }).emails).toEqual(["First@x.io", "second@x.io"]);
    expect(setPersonEmailsInputSchema.parse({ personId: id, emails: [] }).emails).toEqual([]);
  });

  it("needs at least one identifier for a duplicate check, counting the emails list", () => {
    expect(personIdentitySchema.safeParse({ fullName: "Marta Chen" }).success).toBe(false);
    expect(personIdentitySchema.safeParse({ fullName: "Marta Chen", emails: ["m@x.io"] }).success).toBe(true);
    expect(personIdentitySchema.safeParse({ fullName: "Marta Chen", organizationDomain: "https://www.Acme.io" }).success).toBe(true);
  });

  it("bounds searches and rejects a cursor from another sort", () => {
    expect(personSearchQuerySchema.parse({})).toEqual({ scope: "active", sort: "updated", limit: 25 });
    expect(personSearchQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(personSearchQuerySchema.safeParse({ cursor: "garbage" }).success).toBe(false);
  });

  it("keeps the first spelling of a link written twice, and caps the list", () => {
    const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
    expect(setPersonLinksInputSchema.parse({ personId, links: [{ type: "website", url: "http://www.a.dev/x/" }, { type: "other", url: "https://a.dev/x" }] }).links).toEqual([{ type: "website", url: "http://www.a.dev/x/" }]);
    expect(setPersonLinksInputSchema.safeParse({ personId, links: Array.from({ length: 11 }, (_, index) => ({ type: "other", url: `https://a.dev/${index}` })) }).success).toBe(false);
    expect(setPersonLinksInputSchema.safeParse({ personId, links: [{ type: "website", url: "javascript:alert(1)" }] }).success).toBe(false);
  });
});
