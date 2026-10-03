import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FollowUpView } from "@/modules/followups/domain/followup.types";
import { FollowUpRow } from "@/modules/followups/ui/FollowUpRow";
import { renderWithTheme } from "@/test/render-with-theme";

const now = new Date("2026-09-30T12:00:00Z");
const followUp: FollowUpView = {
  id: "f1", status: "active", reason: "Ask about Q1 budget", dueAt: "2026-10-05T12:00:00.000Z", notBeforeAt: null, suggestedChannel: "linkedin", completedAt: null, dismissedReason: null,
  createdAt: "2026-09-01T00:00:00.000Z", prospect: { id: "p1", status: "contacted", routeName: "Agencies" }, person: { id: "person-1", fullName: "Marta Chen" }, organization: { id: "org-1", name: "Bluewave" }
};

describe("FollowUpRow", () => {
  it("shows who it is about, why, how soon and the suggested channel", () => {
    renderWithTheme(<FollowUpRow followUp={followUp} now={now} onSelect={vi.fn()} selected={false} />);

    expect(screen.getByText("Marta Chen · Bluewave")).toBeInTheDocument();
    expect(screen.getByText("Ask about Q1 budget")).toBeInTheDocument();
    expect(screen.getByText("Due in 5 days")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
  });

  it("says overdue for a past date, and no date for an undated one", () => {
    const { rerender } = renderWithTheme(<FollowUpRow followUp={{ ...followUp, dueAt: "2026-09-20T12:00:00.000Z" }} now={now} onSelect={vi.fn()} selected={false} />);
    expect(screen.getByText("Overdue by 10 days")).toBeInTheDocument();

    rerender(<FollowUpRow followUp={{ ...followUp, dueAt: null }} now={now} onSelect={vi.fn()} selected={false} />);
    expect(screen.getByText("No date")).toBeInTheDocument();
  });

  it("shows how a finished one ended instead of urgency", () => {
    renderWithTheme(<FollowUpRow followUp={{ ...followUp, status: "completed", dueAt: null, completedAt: "2026-09-25T10:00:00.000Z" }} now={now} onSelect={vi.fn()} selected={false} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByText(/Due in|Overdue/)).toBeNull();
  });

  it("selects on click", () => {
    const onSelect = vi.fn();
    renderWithTheme(<FollowUpRow followUp={followUp} now={now} onSelect={onSelect} selected={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalled();
  });
});
