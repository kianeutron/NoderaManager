import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AttentionQueue } from "@/modules/analytics/ui/AttentionQueue";
import { overviewFixture } from "@/test/factories/overview";
import { renderWithApp } from "@/test/render-with-app";

const now = new Date("2026-10-01T12:00:00.000Z");

describe("AttentionQueue", () => {
  it("lists overdue follow-ups and unanswered messages, each linking to where it is handled", () => {
    const { followUps, awaitingReply } = overviewFixture();
    renderWithApp(<AttentionQueue awaitingReply={awaitingReply} followUps={followUps} now={now} />);

    expect(screen.getByRole("link", { name: /Julian Park/ })).toHaveAttribute("href", "/outreach?view=followups&id=f1");
    expect(screen.getByText("Overdue by 3 days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Marta Chen/ })).toHaveAttribute("href", "/outreach?id=m1");
    expect(screen.getByText("Sent 6 days ago")).toBeInTheDocument();
  });

  it("says how many more there are than the few listed, and links to all of them", () => {
    const { followUps, awaitingReply } = overviewFixture();
    renderWithApp(<AttentionQueue awaitingReply={{ ...awaitingReply, total: 9 }} followUps={followUps} now={now} />);

    expect(screen.getByRole("link", { name: "1 more" })).toHaveAttribute("href", "/outreach?view=followups");
    expect(screen.getByRole("link", { name: "8 more" })).toHaveAttribute("href", "/outreach?reply=none");
  });

  it("tells you when you are clear", () => {
    renderWithApp(<AttentionQueue awaitingReply={{ total: 0, items: [] }} followUps={{ summary: { overdue: 0, next7Days: 0, later: 0, noDate: 0 }, overdue: [] }} now={now} />);
    expect(screen.getByText("You’re clear")).toBeInTheDocument();
  });
});
