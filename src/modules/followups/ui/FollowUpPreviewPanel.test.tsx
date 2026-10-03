import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FollowUpView } from "@/modules/followups/domain/followup.types";
import { FollowUpPreviewPanel } from "@/modules/followups/ui/FollowUpPreviewPanel";
import * as api from "@/modules/followups/ui/followups-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/followups/ui/followups-api");

const active: FollowUpView = {
  id: "f1", status: "active", reason: "Ask about Q1 budget", dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), notBeforeAt: null, suggestedChannel: "email", completedAt: null, dismissedReason: null,
  createdAt: "2026-09-01T00:00:00.000Z", prospect: { id: "p1", status: "contacted", routeName: "Agencies" }, person: { id: "person-1", fullName: "Marta Chen" }, organization: { id: "org-1", name: "Bluewave" }
};

describe("FollowUpPreviewPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchFollowUp).mockResolvedValue(active);
    vi.mocked(api.completeFollowUp).mockResolvedValue({ followUpId: "f1", status: "completed", changed: true, auditEventId: "a1" });
  });

  it("shows the reason, the due date in words, the prospect and links to who it is about", async () => {
    renderWithApp(<FollowUpPreviewPanel followUpId="f1" onClose={vi.fn()} />);

    expect(await screen.findByText("Ask about Q1 budget")).toBeInTheDocument();
    expect(screen.getByText(/Due in 3 days/)).toBeInTheDocument();
    expect(screen.getByText("Agencies")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open person" })).toHaveAttribute("href", "/people?id=person-1");
    expect(screen.getByRole("link", { name: "Open company" })).toHaveAttribute("href", "/people?view=companies&id=org-1");
  });

  it("completes an active follow-up from the footer", async () => {
    renderWithApp(<FollowUpPreviewPanel followUpId="f1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Complete" }));

    await waitFor(() => expect(api.completeFollowUp).toHaveBeenCalledWith("f1"));
  });

  it("explains a failed completion without raw text", async () => {
    vi.mocked(api.completeFollowUp).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "follow_up_finished" }));
    renderWithApp(<FollowUpPreviewPanel followUpId="f1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Complete" }));

    expect(await screen.findByText("This follow-up is already finished.")).toBeInTheDocument();
  });

  it("opens the edit form and the dismiss dialog", async () => {
    renderWithApp(<FollowUpPreviewPanel followUpId="f1" onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByText("Edit follow-up")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(await screen.findByText("Dismiss this follow-up?")).toBeInTheDocument();
  });

  it("offers nothing to change for a finished follow-up, and says why it was dismissed", async () => {
    vi.mocked(api.fetchFollowUp).mockResolvedValue({ ...active, status: "dismissed", dueAt: null, dismissedReason: "Went with another vendor" });
    renderWithApp(<FollowUpPreviewPanel followUpId="f1" onClose={vi.fn()} />);

    expect(await screen.findByText("Went with another vendor")).toBeInTheDocument();
    for (const name of ["Complete", "Edit", "Dismiss"]) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(screen.getByRole("link", { name: "Open person" })).toBeInTheDocument();
  });

  it("says when the follow-up no longer exists", async () => {
    vi.mocked(api.fetchFollowUp).mockRejectedValue(new ApiRequestError(404, { code: "NOT_FOUND" }));
    renderWithApp(<FollowUpPreviewPanel followUpId="f1" onClose={vi.fn()} />);

    expect(await screen.findByText("This follow-up no longer exists.")).toBeInTheDocument();
  });
});
