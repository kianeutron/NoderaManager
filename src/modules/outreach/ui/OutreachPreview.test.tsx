import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OutreachMessageDetail } from "@/modules/outreach/domain/outreach.types";
import { OutreachPreview } from "@/modules/outreach/ui/OutreachPreview";
import { renderWithTheme } from "@/test/render-with-theme";

const message: OutreachMessageDetail = {
  id: "m1", channel: "email", subject: "Quick intro", preview: "Hi", body: "Hi Marta,\n\nThanks for your time.", sentAt: "2026-09-01T10:00:00.000Z", deliveryStatus: "delivered", bounceStatus: "none",
  replyStatus: "replied", prospectId: "p1", person: { id: "person-1", fullName: "Marta Chen" }, organization: { id: "org-1", name: "Bluewave" },
  prospect: { id: "p1", status: "warm", routeName: "Agencies", moduleName: "Staff augmentation" }, campaign: null
};

describe("OutreachPreview", () => {
  it("shows the recipient, the facts, the prospect, the subject and the whole message", () => {
    renderWithTheme(<OutreachPreview message={message} />);

    expect(screen.getByRole("heading", { name: "Marta Chen" })).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText("Replied")).toBeInTheDocument();
    expect(screen.getByText("Warm")).toBeInTheDocument();
    expect(screen.getByText("Agencies · Staff augmentation")).toBeInTheDocument();
    expect(screen.getByText("Quick intro")).toBeInTheDocument();
    expect(screen.getByText(/Thanks for your time\./)).toBeInTheDocument();
  });

  it("mentions a bounce only when there was one", () => {
    const { rerender } = renderWithTheme(<OutreachPreview message={message} />);
    expect(screen.queryByText("Bounce")).toBeNull();

    rerender(<OutreachPreview message={{ ...message, bounceStatus: "hard", deliveryStatus: "failed" }} />);
    expect(screen.getByText("Hard bounce")).toBeInTheDocument();
  });

  it("names the campaign it was sent under, and says nothing when there was none", () => {
    const { rerender } = renderWithTheme(<OutreachPreview message={message} />);
    expect(screen.queryByText(/Campaign:/)).toBeNull();

    rerender(<OutreachPreview message={{ ...message, campaign: { id: "c1", name: "Q4 agencies" } }} />);
    expect(screen.getByText("Campaign: Q4 agencies")).toBeInTheDocument();
  });

  it("omits the subject section when there is none", () => {
    renderWithTheme(<OutreachPreview message={{ ...message, subject: null }} />);
    expect(screen.queryByText("Subject")).toBeNull();
  });
});
