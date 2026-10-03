import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteOverview } from "@/modules/routes/domain/route.types";
import { RoutePreviewPanel } from "@/modules/routes/ui/RoutePreviewPanel";
import * as api from "@/modules/routes/ui/routes-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/routes/ui/routes-api");

const stats = { prospects: 4, openProspects: 3, won: 1, messages: 10, replies: 3 };
const route: RouteOverview = {
  id: "r1", name: "Agency Overflow", description: "Agencies with spare demand", sortOrder: 2, archivedAt: null, stats,
  modules: [
    { id: "m1", name: "UX studios", description: null, archivedAt: null, stats: { prospects: 2, openProspects: 2, won: 0, messages: 6, replies: 2 } },
    { id: "m2", name: "Dev shops", description: null, archivedAt: "2026-09-01T00:00:00.000Z", stats: { prospects: 0, openProspects: 0, won: 0, messages: 0, replies: 0 } }
  ]
};

function show(overrides: Partial<RouteOverview> = {}, scope: "active" | "archived" = "active") {
  vi.mocked(api.fetchRouteOverview).mockResolvedValue([{ ...route, ...overrides }]);
  const onScopeChange = vi.fn();
  renderWithApp(<RoutePreviewPanel onClose={vi.fn()} onScopeChange={onScopeChange} routeId="r1" scope={scope} />);
  return { onScopeChange };
}

describe("RoutePreviewPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.setRouteArchived).mockResolvedValue({ routeId: "r1", archived: true, changed: true, auditEventId: "a1" });
    vi.mocked(api.setRouteModuleArchived).mockResolvedValue({ routeModuleId: "m1", archived: true, changed: true, auditEventId: "a2" });
  });

  it("shows the route's results and each module with its own, archived ones marked", async () => {
    show();

    expect(await screen.findByRole("heading", { name: "Agency Overflow" })).toBeInTheDocument();
    expect(screen.getByText("4 (3 open)")).toBeInTheDocument();
    expect(screen.getByText("UX studios")).toBeInTheDocument();
    expect(screen.getByText("2 prospects (2 open, 0 won) · 6 sent · 2 replies")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("archives a module with one click, and offers Restore on an archived one", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Archive UX studios" }));

    await waitFor(() => expect(api.setRouteModuleArchived).toHaveBeenCalledWith("m1", true));
    expect(screen.getByRole("button", { name: "Restore Dev shops" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Dev shops" })).toBeDisabled();
  });

  it("follows the route to the archived list after archiving it, so the panel does not go blank", async () => {
    const { onScopeChange } = show();
    fireEvent.click(await screen.findByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" }).at(-1) as HTMLElement);

    await waitFor(() => expect(onScopeChange).toHaveBeenCalledWith("archived"));
    expect(api.setRouteArchived).toHaveBeenCalledWith("r1", true);
  });

  it("opens the forms for editing the route, adding a module and editing one", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByText("Edit route")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Add module" }));
    expect(await screen.findByRole("heading", { name: "Add module" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Edit UX studios" }));
    expect(await screen.findByText("Edit module")).toBeInTheDocument();
  });

  it("shows an archived route read-only, with a notice and a way back, and no module actions", async () => {
    show({ archivedAt: "2026-09-10T00:00:00.000Z" }, "archived");

    expect(await screen.findByText(/Archived on/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    for (const name of ["Edit", "Add module", "Edit UX studios", "Archive UX studios"]) expect(screen.queryByRole("button", { name })).toBeNull();
  });

  it("says when the route is not in the list it was picked from, and explains a failed load", async () => {
    vi.mocked(api.fetchRouteOverview).mockResolvedValue([]);
    const { unmount } = renderWithApp(<RoutePreviewPanel onClose={vi.fn()} onScopeChange={vi.fn()} routeId="r1" scope="active" />);
    expect(await screen.findByText("This route is no longer in this list.")).toBeInTheDocument();
    unmount();

    vi.mocked(api.fetchRouteOverview).mockRejectedValue(new ApiRequestError(500, { requestId: "req-8" }));
    renderWithApp(<RoutePreviewPanel onClose={vi.fn()} onScopeChange={vi.fn()} routeId="r1" scope="active" />);
    expect(await screen.findByText(/Reference: req-8/, undefined, { timeout: 6000 })).toBeInTheDocument();
  });
});
