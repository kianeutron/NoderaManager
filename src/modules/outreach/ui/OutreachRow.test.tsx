import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OutreachMessageSummary } from "@/modules/outreach/domain/outreach.types";
import { OutreachRow } from "@/modules/outreach/ui/OutreachRow";
import { renderWithTheme } from "@/test/render-with-theme";

const message: OutreachMessageSummary = {
  id: "m1", channel: "linkedin", subject: null, preview: "Hi Marta, I saw your post", sentAt: "2026-09-01T10:00:00.000Z", deliveryStatus: "sent", replyStatus: "none",
  prospectId: "p1", person: { id: "person-1", fullName: "Marta Chen" }, organization: { id: "org-1", name: "Bluewave" }
};

describe("OutreachRow", () => {
  it("shows who it went to, the start of the text when there is no subject, the channel and the date", () => {
    renderWithTheme(<OutreachRow message={message} onSelect={vi.fn()} selected={false} />);

    expect(screen.getByText("Marta Chen · Bluewave")).toBeInTheDocument();
    expect(screen.getByText("Hi Marta, I saw your post")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("prefers the subject, and only calls out a reply or a failure", () => {
    renderWithTheme(<OutreachRow message={{ ...message, subject: "Quick intro", replyStatus: "replied", deliveryStatus: "failed" }} onSelect={vi.fn()} selected={false} />);

    expect(screen.getByText("Quick intro")).toBeInTheDocument();
    expect(screen.getByText("Replied")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("does not mention delivery when it simply went out, and names a company-only recipient", () => {
    renderWithTheme(<OutreachRow message={{ ...message, person: null }} onSelect={vi.fn()} selected={false} />);

    expect(screen.queryByText("Sent")).toBeNull();
    expect(screen.queryByText("Replied")).toBeNull();
    expect(screen.getByText("Bluewave")).toBeInTheDocument();
  });

  it("selects on click", () => {
    const onSelect = vi.fn();
    renderWithTheme(<OutreachRow message={message} onSelect={onSelect} selected={false} />);
    fireEvent.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalled();
  });
});
