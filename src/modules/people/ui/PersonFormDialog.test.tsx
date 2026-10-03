import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DuplicateCandidate, PersonDetail } from "@/modules/people/domain/person.types";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { PersonFormDialog } from "@/modules/people/ui/PersonFormDialog";
import * as organizationsApi from "@/modules/organizations/ui/organizations-api";
import * as api from "@/modules/people/ui/people-api";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/people/ui/people-api");
vi.mock("@/modules/organizations/ui/organizations-api");

const candidate = (matchLevel: DuplicateCandidate["matchLevel"]): DuplicateCandidate => ({ personId: "p9", fullName: "Marta Chen", organizationName: "Bluewave", matchLevel, reason: "Matching email" });

function open(props: Partial<Parameters<typeof PersonFormDialog>[0]> = {}) {
  const onSaved = vi.fn();
  const onOpenPerson = vi.fn();
  renderWithApp(<PersonFormDialog onClose={vi.fn()} onOpenPerson={onOpenPerson} onSaved={onSaved} {...props} />);
  return { onSaved, onOpenPerson };
}

async function fillAndSubmit(name: string, email?: string) {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: name } });
  if (email) {
    const emails = screen.getByRole("combobox", { name: "Emails" });
    fireEvent.change(emails, { target: { value: email } });
    fireEvent.keyDown(emails, { key: "Enter" });
  }
  fireEvent.click(screen.getByRole("button", { name: "Add person" }));
}

describe("PersonFormDialog (adding)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(organizationsApi.fetchOrganizationsPage).mockResolvedValue({ items: [], total: 0, nextCursor: null });
    vi.mocked(api.createPerson).mockResolvedValue({ personId: "p1", created: true, auditEventId: "a1", possibleDuplicates: [] });
  });

  it("shows the command's own validation message and sends nothing", async () => {
    open();
    await fillAndSubmit("");

    expect(await screen.findByText("This is required.")).toBeInTheDocument();
    expect(api.createPerson).not.toHaveBeenCalled();
  });

  it("creates a person with nothing to compare on, without a duplicate check", async () => {
    const { onSaved } = open();
    await fillAndSubmit("Marta Chen");

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("p1"));
    expect(api.checkPersonDuplicates).not.toHaveBeenCalled();
    expect(api.createPerson).toHaveBeenCalledWith(expect.objectContaining({ fullName: "Marta Chen", confirmNewIdentity: false }));
  });

  it("blocks an exact duplicate and offers to open the existing person", async () => {
    vi.mocked(api.checkPersonDuplicates).mockResolvedValue([candidate("exact")]);
    const { onOpenPerson } = open();
    await fillAndSubmit("Marta Chen", "marta@bluewave.io");

    expect(await screen.findByText("This person already exists")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add anyway/i })).toBeNull();
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Open" }));
    expect(onOpenPerson).toHaveBeenCalledWith("p9");
    expect(api.createPerson).not.toHaveBeenCalled();
  });

  it("lets a strong match through only after explicit confirmation", async () => {
    vi.mocked(api.checkPersonDuplicates).mockResolvedValue([candidate("strong")]);
    const { onSaved } = open();
    await fillAndSubmit("Marta Chen", "other@bluewave.io");

    fireEvent.click(await screen.findByRole("button", { name: /add anyway/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("p1"));
    expect(api.createPerson).toHaveBeenCalledWith(expect.objectContaining({ confirmNewIdentity: true }));
  });

  it("keeps the entered data and explains a rejected save in plain words", async () => {
    vi.mocked(api.checkPersonDuplicates).mockResolvedValue([]);
    vi.mocked(api.createPerson).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "email_taken" }));
    open();
    await fillAndSubmit("Marta Chen", "marta@bluewave.io");

    expect(await screen.findByText("One of those email addresses already belongs to another person.")).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveValue("Marta Chen");
  });

  it.each([
    ["a server fault", new ApiRequestError(500, { code: "INTERNAL_ERROR", requestId: "req-7" }), /Reference: req-7/],
    ["a lost connection", new TypeError("Failed to fetch"), /Could not reach the server/],
    ["an unknown failure", new Error("insert into people failed: postgres://user:pw@host"), /Something went wrong\. Try again\./]
  ])("never shows raw text for %s", async (_case, failure, expected) => {
    vi.mocked(api.checkPersonDuplicates).mockResolvedValue([]);
    vi.mocked(api.createPerson).mockRejectedValue(failure);
    open();
    await fillAndSubmit("Marta Chen", "marta@bluewave.io");

    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/postgres|insert into|Failed to fetch|Request failed/);
  });

  it("says so when the duplicate check itself fails, instead of failing silently", async () => {
    vi.mocked(api.checkPersonDuplicates).mockRejectedValue(new TypeError("Failed to fetch"));
    open();
    await fillAndSubmit("Marta Chen", "marta@bluewave.io");

    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
    expect(api.createPerson).not.toHaveBeenCalled();
  });
});

describe("PersonFormDialog (editing)", () => {
  const person: PersonDetail = {
    id: "p1", fullName: "Marta Chen", role: "CTO", persona: null, organization: null, countryCode: null, city: null, lastContactedAt: null, doNotContact: false,
    updatedAt: "2026-01-02T00:00:00.000Z", languages: [], linkedinUrl: null, emails: [{ email: "marta@bluewave.io", isPrimary: true }], links: [], doNotContactAt: null, doNotContactReason: null, archivedAt: null, prospects: [], recentNotes: []
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(organizationsApi.fetchOrganizationsPage).mockResolvedValue({ items: [], total: 0, nextCursor: null });
    vi.mocked(api.updatePerson).mockResolvedValue({ personId: "p1", changed: true, auditEventId: "a1" });
  });

  it("cannot be saved until something changes", () => {
    open({ person });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("sends only the changed field, and clears one with null", async () => {
    const { onSaved } = open({ person });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Berlin" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("p1"));
    expect(api.updatePerson).toHaveBeenCalledWith("p1", { role: null, city: "Berlin" });
    expect(api.setPersonEmails).not.toHaveBeenCalled();
  });

  it("adds a link and saves only the links", async () => {
    vi.mocked(api.setPersonLinks).mockResolvedValue({ personId: "p1", count: 1, changed: true, auditEventId: "a1" });
    const { onSaved } = open({ person });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: " https://marta.dev " } });
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Home" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("p1"));
    expect(api.setPersonLinks).toHaveBeenCalledWith("p1", [{ type: "website", url: "https://marta.dev", label: "Home" }]);
    expect(api.updatePerson).not.toHaveBeenCalled();
  });

  it("rejects a link that is not a web address before sending anything", async () => {
    open({ person });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "not a link" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter a valid web address, starting with https://")).toBeInTheDocument();
    expect(api.setPersonLinks).not.toHaveBeenCalled();
  });

  it("can remove a link row", () => {
    open({ person });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove link 1" }));

    expect(screen.queryByLabelText("Address")).toBeNull();
  });
});
