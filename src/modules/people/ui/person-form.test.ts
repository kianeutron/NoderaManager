import { describe, expect, it } from "vitest";
import { createPersonInputSchema } from "@/modules/people/domain/person.schema";
import { emptyPersonForm, toCreatePersonInput, toDuplicateCheckInput, toLinkInputs, toPersonSubmission, type PersonFormValues } from "@/modules/people/ui/person-form";

const saved: PersonFormValues = { ...emptyPersonForm, fullName: "Marta Chen", role: "CTO", persona: "fractional_cto", organization: { id: "o1", name: "Bluewave" }, emails: ["marta@bluewave.io"], languages: ["en"] };

describe("person form mapping", () => {
  it("maps a blank create form to the minimal valid command", () => {
    const input = createPersonInputSchema.parse(toCreatePersonInput({ ...emptyPersonForm, fullName: "  Marta   Chen " }));
    expect(input).toMatchObject({ fullName: "Marta Chen", languages: [], emails: [], confirmNewIdentity: false });
    expect(input).not.toHaveProperty("role");
  });

  it("passes the confirmation flag through", () => {
    expect(toCreatePersonInput(saved, true)).toMatchObject({ confirmNewIdentity: true, organizationId: "o1", persona: "fractional_cto" });
  });

  it("skips the duplicate check when there is nothing to compare on", () => {
    expect(toDuplicateCheckInput({ ...emptyPersonForm, fullName: "Marta Chen" })).toBeNull();
    expect(toDuplicateCheckInput(saved)).toEqual({ fullName: "Marta Chen", emails: ["marta@bluewave.io"], organizationId: "o1" });
  });

  it("submits nothing when nothing changed", () => {
    expect(toPersonSubmission(saved, saved)).toEqual({ changes: null, emails: null, links: null });
  });

  it("submits only the changed fields, using null to clear", () => {
    const edited: PersonFormValues = { ...saved, role: "", persona: "founder", organization: null, city: "Berlin", emails: ["new@bluewave.io"] };
    expect(toPersonSubmission(edited, saved)).toEqual({ changes: { role: null, persona: "founder", organizationId: null, city: "Berlin" }, emails: ["new@bluewave.io"], links: null });
  });

  it("ignores link rows left blank, trims the rest, and only submits links that changed", () => {
    const withLinks: PersonFormValues = { ...saved, links: [{ type: "website", url: " https://marta.dev ", label: " Home " }, { type: "other", url: "  ", label: "unused" }] };
    expect(toLinkInputs(withLinks.links)).toEqual([{ type: "website", url: "https://marta.dev", label: "Home" }]);
    expect(toPersonSubmission(withLinks, saved)).toMatchObject({ changes: null, links: [{ type: "website", url: "https://marta.dev", label: "Home" }] });
    expect(toPersonSubmission({ ...withLinks, links: [{ type: "website", url: "https://marta.dev", label: "Home" }] }, withLinks)).toMatchObject({ links: null });
    expect(toPersonSubmission({ ...saved, links: [] }, withLinks)).toMatchObject({ links: [] });
  });
});
