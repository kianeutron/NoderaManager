import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationDetail } from "@/modules/organizations/domain/organization.types";
import { OrganizationFormDialog } from "@/modules/organizations/ui/OrganizationFormDialog";
import * as api from "@/modules/organizations/ui/organizations-api";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/organizations/ui/organizations-api");

const organization: OrganizationDetail = {
  id: "o1", name: "Bluewave", organizationType: "company", sizeBand: null, countryCode: null, industry: "Software", canonicalDomain: "bluewave.io", updatedAt: "2026-01-02T00:00:00.000Z",
  websiteUrl: null, linkedinUrl: null, notes: null, archivedAt: null, domains: [{ domain: "bluewave.io", isCanonical: true }], people: [], prospects: [], recentNotes: []
};

function open(props: Partial<Parameters<typeof OrganizationFormDialog>[0]> = {}) {
  const onSaved = vi.fn();
  const onOpenOrganization = vi.fn();
  renderWithApp(<OrganizationFormDialog onClose={vi.fn()} onOpenOrganization={onOpenOrganization} onSaved={onSaved} {...props} />);
  return { onSaved, onOpenOrganization };
}

describe("OrganizationFormDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.checkSimilarOrganizations).mockResolvedValue([]);
  });

  it("adds a company with defaults and reports the new id", async () => {
    vi.mocked(api.createOrganization).mockResolvedValue({ organizationId: "o9", created: true, auditEventId: "a1", similarOrganizations: [] });
    const { onSaved } = open();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bluewave" } });
    fireEvent.click(screen.getByRole("button", { name: "Add company" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("o9"));
    expect(api.createOrganization).toHaveBeenCalledWith(expect.objectContaining({ name: "Bluewave", organizationType: "company", domains: [] }));
  });

  it("rejects an invalid website before sending", async () => {
    open();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bluewave" } });
    fireEvent.change(screen.getByLabelText("Website"), { target: { value: "not a url" } });
    fireEvent.click(screen.getByRole("button", { name: "Add company" }));

    expect(await screen.findByText("Enter a valid web address, starting with https://")).toBeInTheDocument();
    expect(api.createOrganization).not.toHaveBeenCalled();
  });

  it("edits only what changed", async () => {
    vi.mocked(api.updateOrganization).mockResolvedValue({ organizationId: "o1", changed: true, auditEventId: "a1" });
    const { onSaved } = open({ organization });
    fireEvent.change(screen.getByLabelText("Industry"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("o1"));
    expect(api.updateOrganization).toHaveBeenCalledWith("o1", { industry: null });
    expect(api.setOrganizationDomains).not.toHaveBeenCalled();
  });

  it("shows who already has the name, and adds only after the owner insists", async () => {
    vi.mocked(api.checkSimilarOrganizations).mockResolvedValue([{ organizationId: "o7", name: "Bluewave" }]);
    vi.mocked(api.createOrganization).mockResolvedValue({ organizationId: "o9", created: true, auditEventId: "a1", similarOrganizations: [] });
    const { onSaved, onOpenOrganization } = open();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bluewave" } });
    fireEvent.click(screen.getByRole("button", { name: "Add company" }));

    expect(await screen.findByText("A company with this name already exists")).toBeInTheDocument();
    expect(api.createOrganization).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Open" }));
    expect(onOpenOrganization).toHaveBeenCalledWith("o7");

    fireEvent.click(screen.getByRole("button", { name: /add anyway/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("o9"));
  });

  it("explains a failed similarity check instead of failing silently", async () => {
    vi.mocked(api.checkSimilarOrganizations).mockRejectedValue(new TypeError("Failed to fetch"));
    open();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bluewave" } });
    fireEvent.click(screen.getByRole("button", { name: "Add company" }));

    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
    expect(api.createOrganization).not.toHaveBeenCalled();
  });
});
