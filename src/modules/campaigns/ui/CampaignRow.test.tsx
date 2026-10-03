import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CampaignSummary } from "@/modules/campaigns/domain/campaign.types";
import { CampaignRow } from "@/modules/campaigns/ui/CampaignRow";
import { renderWithTheme } from "@/test/render-with-theme";

const campaign: CampaignSummary = {
  id: "c1", name: "Q4 agencies", status: "active", goal: "Get 5 calls", startsAt: null, endsAt: null, archivedAt: null, updatedAt: "2026-09-01T00:00:00.000Z",
  routes: [{ routeId: "r1", routeName: "Agency Overflow", moduleId: null, moduleName: null }, { routeId: "r2", routeName: "Recruiters", moduleId: "m1", moduleName: "Tech" }, { routeId: "r3", routeName: "Referrals", moduleId: null, moduleName: null }],
  stats: { members: 12, contacted: 8, won: 1, messages: 20, replies: 4 }
};

describe("CampaignRow", () => {
  it("shows the name, goal, status, the first routes with a count of the rest, and what it has produced", () => {
    renderWithTheme(<CampaignRow campaign={campaign} onSelect={vi.fn()} selected={false} />);

    expect(screen.getByText("Q4 agencies")).toBeInTheDocument();
    expect(screen.getByText("Get 5 calls")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Agency Overflow")).toBeInTheDocument();
    expect(screen.getByText("Recruiters · Tech")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("12 prospects")).toBeInTheDocument();
    expect(screen.getByText("4 replies")).toBeInTheDocument();
  });

  it("falls back to the dates when there is no goal, and says nothing about replies when there are none", () => {
    renderWithTheme(<CampaignRow campaign={{ ...campaign, goal: null, startsAt: "2026-10-01T12:00:00.000Z", stats: { ...campaign.stats, replies: 0, members: 1 } }} onSelect={vi.fn()} selected={false} />);

    expect(screen.getByText(/^From Oct 1, 2026/)).toBeInTheDocument();
    expect(screen.getByText("1 prospect")).toBeInTheDocument();
    expect(screen.queryByText(/repl/)).toBeNull();
  });

  it("selects on click", () => {
    const onSelect = vi.fn();
    renderWithTheme(<CampaignRow campaign={campaign} onSelect={onSelect} selected={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalled();
  });
});
