import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignDetail } from "@/modules/campaigns/domain/campaign.types";
import { CampaignPreviewPanel } from "@/modules/campaigns/ui/CampaignPreviewPanel";
import * as api from "@/modules/campaigns/ui/campaigns-api";
import * as routesApi from "@/modules/routes/ui/routes-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/campaigns/ui/campaigns-api");
vi.mock("@/modules/routes/ui/routes-api");

const campaign: CampaignDetail = {
  id: "c1", name: "Q4 agencies", status: "active", goal: "Get 5 calls", startsAt: "2026-10-01T12:00:00.000Z", endsAt: "2026-12-01T12:00:00.000Z", archivedAt: null, updatedAt: "2026-09-01T00:00:00.000Z",
  routes: [{ routeId: "r1", routeName: "Agency Overflow", moduleId: "m1", moduleName: "UX studios" }], stats: { members: 3, contacted: 2, won: 1, messages: 5, replies: 2 },
  targetingRules: { personas: ["recruiter"], countries: ["DE"], organizationTypes: ["agency"] }
};
const member = { id: "mem1", prospectId: "p1", status: "contacted" as const, person: { id: "person-1", fullName: "Marta Chen" }, organization: null, routeName: "Agency Overflow", moduleName: "UX studios", lastContactedAt: null, addedAt: "2026-09-02T00:00:00.000Z" };

describe("CampaignPreviewPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchCampaign).mockResolvedValue(campaign);
    vi.mocked(api.fetchCampaignMembersPage).mockResolvedValue({ items: [member], total: 1, nextCursor: null });
    vi.mocked(routesApi.fetchRouteCatalog).mockResolvedValue([]);
    vi.mocked(api.setCampaignArchived).mockResolvedValue({ campaignId: "c1", archived: true, changed: true, auditEventId: "a1" });
    vi.mocked(api.removeCampaignProspects).mockResolvedValue({ campaignId: "c1", changed: 1, unchanged: 0, auditEventId: "a2" });
  });

  it("shows the status, goal, dates, routes, targeting, results and members", async () => {
    renderWithApp(<CampaignPreviewPanel campaignId="c1" onClose={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Q4 agencies" })).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getByText("Get 5 calls")).toBeInTheDocument();
    expect(screen.getByText(/Oct 1, 2026 to Dec 1, 2026/)).toBeInTheDocument();
    expect(screen.getByText("Agency Overflow · UX studios")).toBeInTheDocument();
    for (const chip of ["Recruiter", "Agency", "DE"]) expect(screen.getByText(chip)).toBeInTheDocument();
    expect(await screen.findByText("Marta Chen")).toBeInTheDocument();
    expect(screen.getByText("Prospects (1)")).toBeInTheDocument();
  });

  it("takes a prospect out of the campaign with one click, since the link can be added back", async () => {
    renderWithApp(<CampaignPreviewPanel campaignId="c1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Take Marta Chen out of the campaign" }));

    await waitFor(() => expect(api.removeCampaignProspects).toHaveBeenCalledWith("c1", ["p1"]));
  });

  it("offers the next steps and Edit while it runs, and nothing to change once it is completed", async () => {
    const { unmount } = renderWithApp(<CampaignPreviewPanel campaignId="c1" onClose={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    unmount();

    vi.mocked(api.fetchCampaign).mockResolvedValue({ ...campaign, status: "completed" });
    renderWithApp(<CampaignPreviewPanel campaignId="c1" onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: "Q4 agencies" });
    for (const name of ["Pause", "Complete", "Edit", "Add prospects"]) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(screen.queryByRole("button", { name: "Take Marta Chen out of the campaign" })).toBeNull();
  });

  it("explains that a running campaign cannot be archived", async () => {
    vi.mocked(api.setCampaignArchived).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "campaign_running" }));
    renderWithApp(<CampaignPreviewPanel campaignId="c1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" }).at(-1) as HTMLElement);

    expect(await screen.findByText("Pause or complete the campaign before archiving it.")).toBeInTheDocument();
  });

  it("shows an archived campaign read-only with a notice and a way back", async () => {
    vi.mocked(api.fetchCampaign).mockResolvedValue({ ...campaign, status: "paused", archivedAt: "2026-09-10T00:00:00.000Z" });
    renderWithApp(<CampaignPreviewPanel campaignId="c1" onClose={vi.fn()} />);

    expect(await screen.findByText(/Archived on/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    for (const name of ["Resume", "Edit", "Add prospects"]) expect(screen.queryByRole("button", { name })).toBeNull();
  });

  it("says when the campaign no longer exists", async () => {
    vi.mocked(api.fetchCampaign).mockRejectedValue(new ApiRequestError(404, { code: "NOT_FOUND" }));
    renderWithApp(<CampaignPreviewPanel campaignId="c1" onClose={vi.fn()} />);

    expect(await screen.findByText("This campaign no longer exists.")).toBeInTheDocument();
  });
});
