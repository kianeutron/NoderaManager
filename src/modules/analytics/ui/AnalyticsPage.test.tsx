import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/modules/analytics/ui/analytics-api";
import { AnalyticsPage } from "@/modules/analytics/ui/AnalyticsPage";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { breakdownFixture, insightsFixture } from "@/test/factories/insights";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/analytics/ui/analytics-api");

const navigate = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({ usePathname: () => "/analytics", useRouter: () => ({ push: navigate, replace: navigate }), useSearchParams: () => new URLSearchParams(search) }));

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    search = "";
    vi.mocked(api.fetchInsights).mockResolvedValue(insightsFixture());
    vi.mocked(api.fetchBreakdown).mockResolvedValue(breakdownFixture());
  });

  it("shows every section over the default 90-day window", async () => {
    renderWithApp(<AnalyticsPage />);

    expect(await screen.findByRole("heading", { name: "Activity" }, { timeout: 5000 })).toBeInTheDocument();
    // The charts load after the first paint, so each panel is awaited.
    for (const title of ["Activity", "Conversion funnel", "Reply time", "Performance breakdown", "Best time to send", "Deliverability"]) expect(await screen.findByRole("heading", { name: title }, { timeout: 5000 })).toBeInTheDocument();
    expect(api.fetchInsights).toHaveBeenCalledWith("90d");
    expect(await screen.findByText("Agency Overflow")).toBeInTheDocument();
  }, 15_000);

  it("reads the window and the split from the URL, and rewrites it without adding history", async () => {
    search = "range=365d&by=persona";
    renderWithApp(<AnalyticsPage />);
    await screen.findByRole("heading", { name: "Activity" }, { timeout: 5000 });

    expect(api.fetchInsights).toHaveBeenCalledWith("365d");
    expect(api.fetchBreakdown).toHaveBeenCalledWith("365d", "persona");
    expect(screen.getByRole("button", { name: "12 months" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "30 days" }));
    expect(navigate).toHaveBeenCalledWith("/analytics?range=30d&by=persona", { scroll: false });
  });

  it("keeps the page's shape while loading and explains a failure with a way to retry", async () => {
    vi.mocked(api.fetchInsights).mockReturnValueOnce(new Promise(() => undefined));
    const { unmount } = renderWithApp(<AnalyticsPage />);
    expect(screen.getByRole("status", { name: "Loading analytics" })).toBeInTheDocument();
    unmount();

    vi.mocked(api.fetchInsights).mockRejectedValue(new ApiRequestError(500, { requestId: "req-4" }));
    renderWithApp(<AnalyticsPage />);
    expect(await screen.findByText(/Reference: req-4/, undefined, { timeout: 10_000 })).toBeInTheDocument();

    vi.mocked(api.fetchInsights).mockResolvedValue(insightsFixture());
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument(), { timeout: 5000 });
  }, 20_000);
});
