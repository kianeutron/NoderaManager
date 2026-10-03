import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FollowUpView } from "@/modules/followups/domain/followup.types";
import { FollowUpForm } from "@/modules/followups/ui/FollowUpForm";
import * as api from "@/modules/followups/ui/followups-api";
import * as outreachApi from "@/modules/outreach/ui/outreach-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/followups/ui/followups-api");
vi.mock("@/modules/outreach/ui/outreach-api");

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const messageId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const target = { prospectId, personName: "Marta Chen", organizationName: "Bluewave", routeName: "Agencies", status: "contacted" } as const;
const saved: FollowUpView = {
  id: "f1", status: "active", reason: "Ask about budget", dueAt: new Date(2026, 10, 1, 9, 0).toISOString(), notBeforeAt: null, suggestedChannel: "email", completedAt: null, dismissedReason: null,
  createdAt: "2026-09-01T00:00:00.000Z", prospect: { id: prospectId, status: "contacted", routeName: "Agencies" }, person: null, organization: null
};

const pickProspect = async () => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Prospect" }));
  fireEvent.click(await screen.findByRole("option", { name: "Marta Chen · Bluewave — Agencies" }));
};

describe("FollowUpForm (adding)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(outreachApi.fetchOutreachTargets).mockResolvedValue([target]);
    vi.mocked(api.createFollowUp).mockResolvedValue({ followUpId: "f9", created: true, auditEventId: "a1" });
  });

  it("needs a prospect and a reason, in plain words", async () => {
    renderWithApp(<FollowUpForm onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add follow-up" }));

    expect(await screen.findAllByText("This is required.")).toHaveLength(2);
    expect(api.createFollowUp).not.toHaveBeenCalled();
  });

  it("creates the follow-up for the chosen prospect with the date from a quick choice", async () => {
    const onSaved = vi.fn();
    renderWithApp(<FollowUpForm onClose={vi.fn()} onSaved={onSaved} />);
    await pickProspect();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "  Ask about budget " } });
    fireEvent.click(screen.getByRole("button", { name: "In a week" }));
    fireEvent.click(screen.getByRole("button", { name: "Add follow-up" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("f9"));
    expect(api.createFollowUp).toHaveBeenCalledWith({ prospectId, reason: "Ask about budget", dueAt: expect.any(Date) });
    const { dueAt } = vi.mocked(api.createFollowUp).mock.calls[0]?.[0] as { dueAt: Date };
    expect(dueAt.getHours()).toBe(9);
    expect(dueAt.getTime()).toBeGreaterThan(Date.now() + 5 * 24 * 60 * 60 * 1000);
  });

  it("knows the prospect and the origin when started from a message, and shows who it is for", async () => {
    const onSaved = vi.fn();
    renderWithApp(<FollowUpForm onClose={vi.fn()} onSaved={onSaved} origin={{ prospectId, originOutreachMessageId: messageId, label: "Marta Chen" }} />);
    expect(screen.getByText("For Marta Chen")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Prospect" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Nudge" } });
    fireEvent.click(screen.getByRole("button", { name: "Add follow-up" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.createFollowUp).toHaveBeenCalledWith({ prospectId, reason: "Nudge", originOutreachMessageId: messageId });
  });

  it("refuses a not-before date after the due date before sending anything", async () => {
    renderWithApp(<FollowUpForm onClose={vi.fn()} onSaved={vi.fn()} origin={{ prospectId, label: "Marta Chen" }} />);
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Nudge" } });
    fireEvent.change(screen.getByLabelText("Due"), { target: { value: "2026-10-01T09:00" } });
    fireEvent.change(screen.getByLabelText("Not before"), { target: { value: "2026-11-01T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add follow-up" }));

    expect(await screen.findByText(/cannot be after the due date/)).toBeInTheDocument();
    expect(api.createFollowUp).not.toHaveBeenCalled();
  });

  it("explains a do-not-contact refusal in plain words and keeps what was typed", async () => {
    vi.mocked(api.createFollowUp).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "person_do_not_contact" }));
    renderWithApp(<FollowUpForm onClose={vi.fn()} onSaved={vi.fn()} origin={{ prospectId, label: "Marta Chen" }} />);
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Nudge" } });
    fireEvent.click(screen.getByRole("button", { name: "Add follow-up" }));

    expect(await screen.findByText("This person is marked do not contact.")).toBeInTheDocument();
    expect(screen.getByLabelText("Reason")).toHaveValue("Nudge");
  });
});

describe("FollowUpForm (editing)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.updateFollowUp).mockResolvedValue({ followUpId: "f1", changed: true, auditEventId: "a1" });
  });

  it("cannot be saved until something changes, and does not offer a prospect", () => {
    renderWithApp(<FollowUpForm followUp={saved} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.queryByRole("combobox", { name: "Prospect" })).toBeNull();
    expect(screen.getByLabelText("Reason")).toHaveValue("Ask about budget");
  });

  it("sends only what changed, and clears the due date with null", async () => {
    const onSaved = vi.fn();
    renderWithApp(<FollowUpForm followUp={saved} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Due"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Ask about Q1 budget" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("f1"));
    expect(api.updateFollowUp).toHaveBeenCalledWith("f1", { reason: "Ask about Q1 budget", dueAt: null });
  });

  it("explains that a finished follow-up cannot change", async () => {
    vi.mocked(api.updateFollowUp).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "follow_up_finished" }));
    renderWithApp(<FollowUpForm followUp={saved} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "New" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("This follow-up is already finished.")).toBeInTheDocument();
  });
});
