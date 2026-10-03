import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignStatusActions } from "@/modules/campaigns/ui/CampaignStatusActions";
import * as api from "@/modules/campaigns/ui/campaigns-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/campaigns/ui/campaigns-api");

describe("CampaignStatusActions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.setCampaignStatus).mockResolvedValue({ campaignId: "c1", status: "active", previousStatus: "draft", changed: true, auditEventId: "a1" });
  });

  it.each([
    ["draft", ["Start"]],
    ["active", ["Pause", "Complete"]],
    ["paused", ["Resume", "Complete"]]
  ] as const)("offers exactly the moves from %s", (status, labels) => {
    renderWithApp(<CampaignStatusActions campaignId="c1" status={status} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(labels);
  });

  it("offers nothing for a completed campaign", () => {
    const { container } = renderWithApp(<CampaignStatusActions campaignId="c1" status="completed" />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("starts straight away, without asking", async () => {
    renderWithApp(<CampaignStatusActions campaignId="c1" status="draft" />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => expect(api.setCampaignStatus).toHaveBeenCalledWith("c1", "active"));
  });

  it("asks before completing, and completes only on confirmation", async () => {
    renderWithApp(<CampaignStatusActions campaignId="c1" status="active" />);
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    expect(await screen.findByText("Complete this campaign?")).toBeInTheDocument();
    expect(api.setCampaignStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Complete" }).at(-1) as HTMLElement);
    await waitFor(() => expect(api.setCampaignStatus).toHaveBeenCalledWith("c1", "completed"));
  });

  it("explains a refusal in plain words", async () => {
    vi.mocked(api.setCampaignStatus).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "campaign_needs_route" }));
    renderWithApp(<CampaignStatusActions campaignId="c1" status="draft" />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(await screen.findByText("Add at least one route before starting this campaign.")).toBeInTheDocument();
  });
});
