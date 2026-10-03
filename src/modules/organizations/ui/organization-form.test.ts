import { describe, expect, it } from "vitest";
import { createOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";
import { emptyOrganizationForm, toCreateOrganizationInput, toOrganizationSubmission, type OrganizationFormValues } from "@/modules/organizations/ui/organization-form";

const saved: OrganizationFormValues = { ...emptyOrganizationForm, name: "Bluewave", industry: "Software", sizeBand: "11_50", domains: ["bluewave.io"] };

describe("organization form mapping", () => {
  it("maps a name-only form to a valid command with defaults", () => {
    expect(createOrganizationInputSchema.parse(toCreateOrganizationInput({ ...emptyOrganizationForm, name: "Bluewave", domains: ["Bluewave.io"] }))).toMatchObject({ name: "Bluewave", organizationType: "company", domains: ["bluewave.io"] });
  });

  it("submits nothing when nothing changed", () => {
    expect(toOrganizationSubmission(saved, saved)).toEqual({ changes: null, domains: null });
  });

  it("submits only the changed fields, using null to clear", () => {
    expect(toOrganizationSubmission({ ...saved, industry: "", sizeBand: "", name: "Bluewave GmbH", domains: [] }, saved)).toEqual({ changes: { name: "Bluewave GmbH", industry: null, sizeBand: null }, domains: [] });
  });
});
