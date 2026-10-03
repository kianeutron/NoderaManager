import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/modules/analytics/ui/analytics-api";
import { PerformanceBreakdown } from "@/modules/analytics/ui/PerformanceBreakdown";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { breakdownFixture } from "@/test/factories/insights";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/analytics/ui/analytics-api");

const show = (by: Parameters<typeof PerformanceBreakdown>[0]["by"] = "route") => {
  const onByChange = vi.fn();
  renderWithApp(<PerformanceBreakdown by={by} onByChange={onByChange} range="90d" />);
  return { onByChange };
};
const names = () => screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("rowheader")[0]?.textContent);

describe("PerformanceBreakdown", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchBreakdown).mockResolvedValue(breakdownFixture());
  });

  it("lists each group with its counts, a reply rate beside the numbers it comes from, and flags thin groups", async () => {
    show();

    expect(await screen.findByText("Agency Overflow")).toBeInTheDocument();
    expect(screen.getByText("5 of 20 replied")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    // Five prospects reached is too few to rank on.
    expect(within(screen.getByText("Recruiters").closest("tr")!).getByText("Small sample")).toBeInTheDocument();
    expect(within(screen.getByText("Agency Overflow").closest("tr")!).queryByText("Small sample")).toBeNull();
    expect(api.fetchBreakdown).toHaveBeenCalledWith("90d", "route");
  });

  it("sorts by sent by default and by reply rate on request", async () => {
    show();
    await screen.findByText("Agency Overflow");
    expect(names()).toEqual(["Agency Overflow", "Recruiters"]);

    fireEvent.click(screen.getByRole("button", { name: "Reply rate" }));
    expect(names()).toEqual(["Recruiters", "Agency Overflow"]);
  });

  it("words groups the way the rest of the app does, and says so when a value is not recorded", async () => {
    vi.mocked(api.fetchBreakdown).mockResolvedValue(breakdownFixture({ dimension: "country", groups: 2, rows: [
      { key: "DE", name: null, sent: 9, reached: 9, repliedProspects: 1, repliedMessages: 1, bounced: 0 },
      { key: null, name: null, sent: 3, reached: 3, repliedProspects: 0, repliedMessages: 0, bounced: 2 }
    ] }));
    show("country");

    expect(await screen.findByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("Country not set")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Results by country" })).toBeInTheDocument();
  });

  it("changes what the results are split by from the tabs, and says when the list was cut", async () => {
    vi.mocked(api.fetchBreakdown).mockResolvedValue(breakdownFixture({ groups: 61 }));
    const { onByChange } = show();
    await screen.findByText("Agency Overflow");

    expect(screen.getByText("Showing the 2 biggest of 61 groups.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Persona" }));
    expect(onByChange).toHaveBeenCalledWith("persona");
  });

  it("says so when nothing was sent, and explains a failed load in plain words", async () => {
    vi.mocked(api.fetchBreakdown).mockResolvedValue(breakdownFixture({ rows: [], groups: 0 }));
    const { unmount } = renderWithApp(<PerformanceBreakdown by="route" onByChange={vi.fn()} range="7d" />);
    expect(await screen.findByText(/Nothing was sent in this window/)).toBeInTheDocument();
    unmount();

    vi.mocked(api.fetchBreakdown).mockRejectedValue(new ApiRequestError(500, { requestId: "req-9" }));
    renderWithApp(<PerformanceBreakdown by="route" onByChange={vi.fn()} range="30d" />);
    expect(await screen.findByText(/Reference: req-9/, undefined, { timeout: 10_000 })).toBeInTheDocument();
  }, 15_000);
});
