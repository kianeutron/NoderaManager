import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/modules/analytics/ui/analytics-api";
import { overviewFixture } from "@/test/factories/overview";
import { OverviewPage } from "@/modules/analytics/ui/OverviewPage";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/analytics/ui/analytics-api");
vi.mock("@/modules/outreach/ui/LogOutreachDialog", () => ({ LogOutreachDialog: () => <button type="button">Log outreach</button> }));

const navigate = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: navigate, replace: navigate }), useSearchParams: () => new URLSearchParams(search) }));

describe("OverviewPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    search = "";
    vi.mocked(api.fetchOverview).mockResolvedValue(overviewFixture());
  });

  it("opens with what needs doing today, then the figures and every section behind it", async () => {
    renderWithApp(<OverviewPage />);

    expect(await screen.findByText("2 follow-ups overdue and 1 message waiting on a reply.")).toBeInTheDocument();
    // The charts load after the first paint, so each panel is awaited.
    for (const title of ["Activity", "Needs you", "Pipeline", "Rhythm", "How deep replies go", "Routes", "Channels", "Campaigns"]) expect(await screen.findByRole("heading", { name: title }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("Messages sent")).toBeInTheDocument();
    expect(api.fetchOverview).toHaveBeenCalledWith("30d");
  }, 15_000);

  it("measures over the window in the URL, and changing it rewrites the URL without adding history", async () => {
    search = "range=7d";
    renderWithApp(<OverviewPage />);
    await screen.findByText("Messages sent");

    expect(api.fetchOverview).toHaveBeenCalledWith("7d");
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "90 days" }));
    expect(navigate).toHaveBeenCalledWith("/?range=90d", { scroll: false });
  });

  it("shows the page's shape while loading, so nothing jumps", () => {
    vi.mocked(api.fetchOverview).mockReturnValue(new Promise(() => undefined));
    renderWithApp(<OverviewPage />);

    expect(screen.getByRole("status", { name: "Loading overview" })).toBeInTheDocument();
    expect(screen.getByText("Reading your pipeline…")).toBeInTheDocument();
  });

  it("explains a failure in plain words and retries on request", async () => {
    vi.mocked(api.fetchOverview).mockRejectedValue(new ApiRequestError(500, { requestId: "req-3" }));
    renderWithApp(<OverviewPage />);

    expect(await screen.findByText(/Reference: req-3/, undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText("The overview could not be loaded")).toBeInTheDocument();

    vi.mocked(api.fetchOverview).mockResolvedValue(overviewFixture());
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("Messages sent")).toBeInTheDocument());
  }, 15_000);
});
