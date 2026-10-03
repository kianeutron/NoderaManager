import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProspectFormDialog } from "@/modules/prospects/ui/ProspectFormDialog";
import * as api from "@/modules/prospects/ui/prospects-api";
import * as routesApi from "@/modules/routes/ui/routes-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/prospects/ui/prospects-api");
vi.mock("@/modules/routes/ui/routes-api");

const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const agencies = { id: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91", name: "Agencies", description: null, modules: [{ id: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d92", name: "Staff augmentation", description: null }] };
const recruiters = { id: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d93", name: "Recruiters", description: null, modules: [] };

const choose = async (label: string, option: string) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
};

function open() {
  const onSaved = vi.fn();
  renderWithApp(<ProspectFormDialog onClose={vi.fn()} onSaved={onSaved} subject={{ personId }} subjectLabel="Marta Chen" />);
  return { onSaved };
}

describe("ProspectFormDialog (adding)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(routesApi.fetchRouteCatalog).mockResolvedValue([agencies, recruiters]);
    vi.mocked(api.createProspect).mockResolvedValue({ prospectId: "p1", created: true, auditEventId: "a1" });
  });

  it("names who the prospect is for and needs a route", async () => {
    open();
    expect(screen.getByText("Add prospect for Marta Chen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add prospect" }));

    expect(await screen.findByText("This is required.")).toBeInTheDocument();
    expect(api.createProspect).not.toHaveBeenCalled();
  });

  it("creates the prospect for that person with the chosen route and module", async () => {
    const { onSaved } = open();
    await choose("Route", "Agencies");
    await choose("Module", "Staff augmentation");
    fireEvent.change(screen.getByLabelText("Next action"), { target: { value: "Send intro" } });
    fireEvent.click(screen.getByRole("button", { name: "Add prospect" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.createProspect).toHaveBeenCalledWith({ personId, routeId: agencies.id, routeModuleId: agencies.modules[0]?.id, status: "researched", nextAction: "Send intro" });
  });

  it("drops the module when another route is chosen", async () => {
    open();
    await choose("Route", "Agencies");
    await choose("Module", "Staff augmentation");
    await choose("Route", "Recruiters");
    fireEvent.click(screen.getByRole("button", { name: "Add prospect" }));

    await waitFor(() => expect(api.createProspect).toHaveBeenCalled());
    expect(api.createProspect).toHaveBeenCalledWith(expect.not.objectContaining({ routeModuleId: expect.anything() }));
  });

  it("explains a rule the server enforces, in plain words", async () => {
    vi.mocked(api.createProspect).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "person_do_not_contact" }));
    open();
    await choose("Route", "Agencies");
    fireEvent.click(screen.getByRole("button", { name: "Add prospect" }));

    expect(await screen.findByText(/marked do not contact/)).toBeInTheDocument();
  });

  it("says so when the routes could not be loaded", async () => {
    vi.mocked(routesApi.fetchRouteCatalog).mockRejectedValue(new TypeError("Failed to fetch"));
    open();

    // The catalog query retries a lost connection twice before giving up, so the notice takes a few seconds.
    expect(await screen.findByText(/Could not reach the server/, undefined, { timeout: 6000 })).toBeInTheDocument();
  });
});
