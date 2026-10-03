import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CampaignPulse } from "@/modules/analytics/ui/CampaignPulse";
import { overviewFixture } from "@/test/factories/overview";
import { renderWithApp } from "@/test/render-with-app";

describe("CampaignPulse", () => {
  it("shows each running campaign with how many of its prospects were contacted, linking to it", () => {
    renderWithApp(<CampaignPulse campaigns={overviewFixture().campaigns} />);

    expect(screen.getByRole("link", { name: /Q4 agencies/ })).toHaveAttribute("href", "/routes?view=campaigns&id=c1");
    expect(screen.getByLabelText("4 of 8 prospects contacted")).toBeInTheDocument();
    expect(screen.getByText("4 of 8 contacted · 6 sent · 2 replied")).toBeInTheDocument();
  });

  it("says what to do when nothing is running", () => {
    renderWithApp(<CampaignPulse campaigns={[]} />);
    expect(screen.getByText(/No campaign is running/)).toBeInTheDocument();
  });
});
