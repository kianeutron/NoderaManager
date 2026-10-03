import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { overviewFixture } from "@/test/factories/overview";
import { RouteLeaderboard } from "@/modules/analytics/ui/RouteLeaderboard";
import { renderWithApp } from "@/test/render-with-app";

describe("RouteLeaderboard", () => {
  it("ranks routes by messages sent, with the counts behind each rate", () => {
    renderWithApp(<RouteLeaderboard routes={overviewFixture().routes} />);

    const names = screen.getAllByRole("link").map((link) => link.textContent);
    expect(names.indexOf("Agency Overflow")).toBeLessThan(names.indexOf("Recruiters"));
    expect(screen.getByText("3 of 12 replied · 25%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agency Overflow" })).toHaveAttribute("href", "/routes?id=r1");
  });

  it("flags a rate on fewer than ten messages instead of letting it rank as evidence", () => {
    renderWithApp(<RouteLeaderboard routes={overviewFixture().routes} />);
    expect(screen.getAllByText("Small sample")).toHaveLength(1);
  });

  it("explains an empty list", () => {
    renderWithApp(<RouteLeaderboard routes={[]} />);
    expect(screen.getByText(/Add a route and log messages/)).toBeInTheDocument();
  });
});
