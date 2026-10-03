import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignSuggestion } from "@/modules/campaigns/domain/campaign.types";
import { AddProspectsDialog } from "@/modules/campaigns/ui/AddProspectsDialog";
import * as api from "@/modules/campaigns/ui/campaigns-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/campaigns/ui/campaigns-api");

const suggestion = (id: string, name: string, matchesRules: boolean): CampaignSuggestion => ({ prospectId: id, status: "ready", person: { id: `person-${id}`, fullName: name }, organization: null, routeName: "Agencies", moduleName: null, lastContactedAt: null, matchesRules });

describe("AddProspectsDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchCampaignSuggestions).mockResolvedValue([suggestion("p1", "Marta Chen", true), suggestion("p2", "Ben Ortiz", false)]);
    vi.mocked(api.addCampaignProspects).mockResolvedValue({ campaignId: "c1", changed: 2, unchanged: 0, auditEventId: "a1" });
  });

  it("lists who could join, marks those that fit the targeting, and cannot add until something is ticked", async () => {
    renderWithApp(<AddProspectsDialog campaignId="c1" onClose={vi.fn()} />);

    expect(await screen.findByText("Marta Chen")).toBeInTheDocument();
    expect(screen.getByText("Fits targeting")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("adds exactly the ones ticked and closes", async () => {
    const onClose = vi.fn();
    renderWithApp(<AddProspectsDialog campaignId="c1" onClose={onClose} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Marta Chen" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Ben Ortiz" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Ben Ortiz" }));
    fireEvent.click(screen.getByRole("button", { name: "Add 1" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.addCampaignProspects).toHaveBeenCalledWith("c1", ["p1"]);
  });

  it("says so when there is nothing to suggest", async () => {
    vi.mocked(api.fetchCampaignSuggestions).mockResolvedValue([]);
    renderWithApp(<AddProspectsDialog campaignId="c1" onClose={vi.fn()} />);

    expect(await screen.findByText(/No prospects to suggest/)).toBeInTheDocument();
  });

  it("explains a refusal in plain words and stays open", async () => {
    vi.mocked(api.addCampaignProspects).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "prospect_outside_campaign_routes" }));
    renderWithApp(<AddProspectsDialog campaignId="c1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Marta Chen" }));
    fireEvent.click(screen.getByRole("button", { name: "Add 1" }));

    expect(await screen.findByText("That prospect's route isn't one of this campaign's routes.")).toBeInTheDocument();
  });
});
