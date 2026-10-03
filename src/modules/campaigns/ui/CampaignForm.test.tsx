import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignDetail } from "@/modules/campaigns/domain/campaign.types";
import { CampaignForm } from "@/modules/campaigns/ui/CampaignForm";
import * as api from "@/modules/campaigns/ui/campaigns-api";
import * as routesApi from "@/modules/routes/ui/routes-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/campaigns/ui/campaigns-api");
vi.mock("@/modules/routes/ui/routes-api");

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const moduleId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const catalog = [{ id: routeId, name: "Agency Overflow", description: null, modules: [{ id: moduleId, name: "UX studios", description: null }] }];
const saved: CampaignDetail = {
  id: "c1", name: "Q4 agencies", status: "draft", goal: "Get 5 calls", startsAt: new Date(2026, 9, 1, 9, 0).toISOString(), endsAt: new Date(2026, 11, 1, 9, 0).toISOString(), archivedAt: null, updatedAt: "2026-09-01T00:00:00.000Z",
  routes: [{ routeId, routeName: "Agency Overflow", moduleId: null, moduleName: null }], stats: { members: 0, contacted: 0, won: 0, messages: 0, replies: 0 },
  targetingRules: { personas: ["recruiter"], countries: ["DE"], organizationTypes: [] }
};

const choose = async (label: string, option: string) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
};

describe("CampaignForm (adding)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(routesApi.fetchRouteCatalog).mockResolvedValue(catalog);
    vi.mocked(api.createCampaign).mockResolvedValue({ campaignId: "c9", created: true, auditEventId: "a1" });
  });

  it("needs a name, in plain words, and sends nothing without one", async () => {
    renderWithApp(<CampaignForm onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add campaign" }));

    expect(await screen.findByText("This is required.")).toBeInTheDocument();
    expect(api.createCampaign).not.toHaveBeenCalled();
  });

  it("creates a draft with a window, routes and targeting", async () => {
    const onSaved = vi.fn();
    renderWithApp(<CampaignForm onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Q4 agencies " } });
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: "2026-10-01T09:00" } });
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "2026-12-01T09:00" } });
    await choose("Routes it works", "Agency Overflow · UX studios");
    await choose("Personas", "Recruiter");
    fireEvent.click(screen.getByRole("button", { name: "Add campaign" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("c9"));
    expect(api.createCampaign).toHaveBeenCalledWith({ name: "Q4 agencies", startsAt: new Date(2026, 9, 1, 9, 0), endsAt: new Date(2026, 11, 1, 9, 0), targetingRules: { personas: ["recruiter"], countries: [], organizationTypes: [] }, routes: [{ routeId, routeModuleId: moduleId }] });
  });

  it("refuses an end before the start before sending anything", async () => {
    renderWithApp(<CampaignForm onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: "2026-12-01T09:00" } });
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "2026-10-01T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add campaign" }));

    expect(await screen.findByText("The end cannot be before the start.")).toBeInTheDocument();
    expect(api.createCampaign).not.toHaveBeenCalled();
  });

  it("explains a taken name in plain words and keeps what was typed", async () => {
    vi.mocked(api.createCampaign).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "campaign_name_taken" }));
    renderWithApp(<CampaignForm onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Q4 agencies" } });
    fireEvent.click(screen.getByRole("button", { name: "Add campaign" }));

    expect(await screen.findByText("Another campaign already has that name.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Q4 agencies");
  });
});

describe("CampaignForm (editing)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(routesApi.fetchRouteCatalog).mockResolvedValue(catalog);
    vi.mocked(api.updateCampaign).mockResolvedValue({ campaignId: "c1", changed: true, auditEventId: "a1" });
    vi.mocked(api.setCampaignRoutes).mockResolvedValue({ campaignId: "c1", changed: true, auditEventId: "a2" });
  });

  it("cannot be saved until something changes, and shows what is saved", () => {
    renderWithApp(<CampaignForm campaign={saved} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByLabelText("Name")).toHaveValue("Q4 agencies");
    expect(screen.getByLabelText("Starts")).toHaveValue("2026-10-01T09:00");
  });

  it("sends only the changed fields, clears a date with null, and does not touch the routes", async () => {
    const onSaved = vi.fn();
    renderWithApp(<CampaignForm campaign={saved} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Goal"), { target: { value: "Get 8 calls" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("c1"));
    expect(api.updateCampaign).toHaveBeenCalledWith("c1", { goal: "Get 8 calls", endsAt: null });
    expect(api.setCampaignRoutes).not.toHaveBeenCalled();
  });

  it("changes the routes through their own command when the set differs", async () => {
    const onSaved = vi.fn();
    renderWithApp(<CampaignForm campaign={saved} onClose={vi.fn()} onSaved={onSaved} />);
    await choose("Routes it works", "Agency Overflow · UX studios");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.setCampaignRoutes).toHaveBeenCalledWith("c1", [{ routeId }, { routeId, routeModuleId: moduleId }]);
    expect(api.updateCampaign).not.toHaveBeenCalled();
  });

  it("catches an end before the untouched start", async () => {
    renderWithApp(<CampaignForm campaign={saved} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "2026-09-01T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("The end cannot be before the start.")).toBeInTheDocument();
    expect(api.updateCampaign).not.toHaveBeenCalled();
  });

  it("explains that a finished campaign cannot change", async () => {
    vi.mocked(api.updateCampaign).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "campaign_finished" }));
    renderWithApp(<CampaignForm campaign={saved} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Goal"), { target: { value: "New" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("This campaign is finished and can't change.")).toBeInTheDocument();
  });
});
