import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteOverview } from "@/modules/routes/domain/route.types";
import { RoutesResults } from "@/modules/routes/ui/RoutesResults";
import * as api from "@/modules/routes/ui/routes-api";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/routes/ui/routes-api");

const route = (id: string, name: string, replies: number): RouteOverview => ({
  id, name, description: `About ${name}`, sortOrder: 0, archivedAt: null,
  stats: { prospects: 1, openProspects: 1, won: 0, messages: 2, replies },
  modules: [{ id: `${id}-m`, name: "Module", description: null, archivedAt: null, stats: { prospects: 0, openProspects: 0, won: 0, messages: 0, replies: 0 } }, { id: `${id}-old`, name: "Old", description: null, archivedAt: "2026-09-01T00:00:00.000Z", stats: { prospects: 0, openProspects: 0, won: 0, messages: 0, replies: 0 } }]
});

describe("RoutesResults", () => {
  beforeEach(() => vi.resetAllMocks());

  it("lists each route with its live module count (not archived ones) and what it produced, and selects on click", async () => {
    vi.mocked(api.fetchRouteOverview).mockResolvedValue([route("r1", "Agency Overflow", 1), route("r2", "Recruiters", 0)]);
    const onSelect = vi.fn();
    renderWithApp(<RoutesResults onSelect={onSelect} onShowActive={vi.fn()} scope="active" selectedId={null} />);

    expect(await screen.findByText("Agency Overflow")).toBeInTheDocument();
    expect(screen.getAllByText("1 module")).toHaveLength(2);
    expect(screen.getByText("1 reply")).toBeInTheDocument();
    expect(screen.getAllByText("2 sent")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Recruiters/ }));
    expect(onSelect).toHaveBeenCalledWith("r2");
  });

  it("says what to do when there are no routes, and offers the way back from an empty archive", async () => {
    vi.mocked(api.fetchRouteOverview).mockResolvedValue([]);
    const { unmount } = renderWithApp(<RoutesResults onSelect={vi.fn()} onShowActive={vi.fn()} scope="active" selectedId={null} />);
    expect(await screen.findByText("No routes yet")).toBeInTheDocument();
    unmount();

    const onShowActive = vi.fn();
    renderWithApp(<RoutesResults onSelect={vi.fn()} onShowActive={onShowActive} scope="archived" selectedId={null} />);
    fireEvent.click(await screen.findByRole("button", { name: "Show active routes" }));
    expect(onShowActive).toHaveBeenCalled();
  });
});
