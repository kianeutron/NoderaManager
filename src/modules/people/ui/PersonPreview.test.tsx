import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PersonDetail } from "@/modules/people/domain/person.types";
import { PersonPreview } from "@/modules/people/ui/PersonPreview";
import { renderWithApp } from "@/test/render-with-app";

const person: PersonDetail = {
  id: "p1", fullName: "Ada Lovelace", role: "CTO", persona: "fractional_cto", organization: { id: "o1", name: "Analytical Ltd" },
  countryCode: "GB", city: "London", lastContactedAt: null, doNotContact: false, updatedAt: "2026-01-02T00:00:00.000Z",
  languages: ["en"], linkedinUrl: null, emails: [{ email: "ada@example.com", isPrimary: true }], links: [],
  doNotContactAt: null, doNotContactReason: null, archivedAt: null, prospects: [{ id: "x1", status: "contacted", routeName: "Agencies", moduleName: null }], recentNotes: []
};

describe("PersonPreview", () => {
  it("shows contact details and opens the organization", () => {
    const onOpenOrganization = vi.fn();
    renderWithApp(<PersonPreview onOpenOrganization={onOpenOrganization} person={person} />);

    expect(screen.getByRole("link", { name: "ada@example.com" })).toHaveAttribute("href", "mailto:ada@example.com");
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Analytical Ltd" }));
    expect(onOpenOrganization).toHaveBeenCalledWith("o1");
  });

  it("flags do-not-contact prominently", () => {
    renderWithApp(<PersonPreview onOpenOrganization={vi.fn()} person={{ ...person, doNotContact: true, doNotContactReason: "Asked to stop" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Asked to stop");
  });
});
