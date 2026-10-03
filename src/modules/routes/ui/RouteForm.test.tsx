import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteOverview } from "@/modules/routes/domain/route.types";
import { RouteForm } from "@/modules/routes/ui/RouteForm";
import * as api from "@/modules/routes/ui/routes-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/routes/ui/routes-api");

const stats = { prospects: 0, openProspects: 0, won: 0, messages: 0, replies: 0 };
const saved: RouteOverview = { id: "r1", name: "Agency Overflow", description: "Agencies with spare demand", sortOrder: 2, archivedAt: null, stats, modules: [] };

describe("RouteForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.createRoute).mockResolvedValue({ routeId: "r9", created: true, auditEventId: "a1" });
    vi.mocked(api.updateRoute).mockResolvedValue({ routeId: "r1", changed: true, auditEventId: "a2" });
  });

  it("needs a name, in plain words, and sends nothing without one", async () => {
    renderWithApp(<RouteForm onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add route" }));

    expect(await screen.findByText("This is required.")).toBeInTheDocument();
    expect(api.createRoute).not.toHaveBeenCalled();
  });

  it("adds a route, with the order as a number, and reports the new id", async () => {
    const onSaved = vi.fn();
    renderWithApp(<RouteForm onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Recruiters " } });
    fireEvent.change(screen.getByLabelText("Order"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Add route" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("r9"));
    expect(api.createRoute).toHaveBeenCalledWith({ name: "Recruiters", sortOrder: 3 });
  });

  it("refuses an order that is not a whole number", async () => {
    renderWithApp(<RouteForm onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Recruiters" } });
    fireEvent.change(screen.getByLabelText("Order"), { target: { value: "soon" } });
    fireEvent.click(screen.getByRole("button", { name: "Add route" }));

    expect(await screen.findByText("This value isn't valid.")).toBeInTheDocument();
    expect(api.createRoute).not.toHaveBeenCalled();
  });

  it("cannot be saved until something changes, then sends only the change, clearing the description with null", async () => {
    const onSaved = vi.fn();
    renderWithApp(<RouteForm onClose={vi.fn()} onSaved={onSaved} route={saved} />);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("r1"));
    expect(api.updateRoute).toHaveBeenCalledWith("r1", { description: null });
  });

  it("explains a taken name in plain words and keeps what was typed", async () => {
    vi.mocked(api.updateRoute).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "route_name_taken" }));
    renderWithApp(<RouteForm onClose={vi.fn()} onSaved={vi.fn()} route={saved} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Recruiters" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Another route already has that name.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Recruiters");
  });
});
