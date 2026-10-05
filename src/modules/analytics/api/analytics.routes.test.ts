// @vitest-environment node
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsRoutes } from "@/modules/analytics/api/analytics.routes";
import { getAnalyticsServices } from "@/modules/analytics/application/analytics-services";
import type { AnalyticsServices } from "@/modules/analytics/application/create-analytics-services";
import { handleApiError } from "@/shared/api/api-error-handler";
import { requireDashboardOwner } from "@/shared/auth/access-boundary";
import { getMemoryRateLimiter } from "@/shared/rate-limit/memory-rate-limiter";
import { createFakeServices } from "@/test/fake-services";
import { createActor } from "@/test/factories/actors";

vi.mock("@/shared/auth/access-boundary", () => ({
  requireDashboardOwner: vi.fn(),
  AccessBoundaryError: class extends Error { public constructor(public readonly status: 401 | 403) { super("Access denied"); } }
}));
vi.mock("@/shared/rate-limit/rate-limiter", () => ({ getRateLimiter: vi.fn() }));
vi.mock("@/shared/rate-limit/memory-rate-limiter", () => ({ getMemoryRateLimiter: vi.fn() }));
vi.mock("@/modules/analytics/application/analytics-services", () => ({ getAnalyticsServices: vi.fn() }));

const app = new Hono().route("/analytics", analyticsRoutes).onError(handleApiError);

describe("analytics routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireDashboardOwner).mockResolvedValue(createActor());
    vi.mocked(getMemoryRateLimiter).mockReturnValue({ enforce: vi.fn() });
  });

  it("returns the overview for a range, uncached, and defaults to 30 days", async () => {
    const services = createFakeServices<AnalyticsServices>();
    services.getOverview.mockResolvedValue({ range: "7d" } as never);
    vi.mocked(getAnalyticsServices).mockReturnValue(services);

    const response = await app.request("/analytics/overview?range=7d");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
    expect(services.getOverview).toHaveBeenCalledWith({ range: "7d" });

    await app.request("/analytics/overview");
    expect(services.getOverview).toHaveBeenLastCalledWith({ range: "30d" });
  });

  it("refuses a range it does not know, without reading anything", async () => {
    const services = createFakeServices<AnalyticsServices>();
    vi.mocked(getAnalyticsServices).mockReturnValue(services);

    const response = await app.request("/analytics/overview?range=1y");
    expect(response.status).toBe(400);
    expect(services.getOverview).not.toHaveBeenCalled();
  });

  it("returns the insights and the breakdown with their defaults, uncached", async () => {
    const services = createFakeServices<AnalyticsServices>();
    services.getInsights.mockResolvedValue({ range: "90d" } as never);
    services.getBreakdown.mockResolvedValue({ dimension: "route" } as never);
    vi.mocked(getAnalyticsServices).mockReturnValue(services);

    const insights = await app.request("/analytics/insights");
    expect(insights.headers.get("cache-control")).toBe("private, no-cache");
    expect(services.getInsights).toHaveBeenCalledWith({ range: "90d" });

    await app.request("/analytics/breakdown?by=country&range=365d&limit=10");
    expect(services.getBreakdown).toHaveBeenCalledWith({ range: "365d", by: "country", limit: 10 });
    await app.request("/analytics/breakdown");
    expect(services.getBreakdown).toHaveBeenLastCalledWith({ range: "90d", by: "route", limit: 25 });
  });

  it("refuses a dimension it does not know and a list longer than it will return", async () => {
    const services = createFakeServices<AnalyticsServices>();
    vi.mocked(getAnalyticsServices).mockReturnValue(services);

    expect((await app.request("/analytics/breakdown?by=password")).status).toBe(400);
    expect((await app.request("/analytics/breakdown?limit=500")).status).toBe(400);
    expect((await app.request("/analytics/breakdown?unexpected=1")).status).toBe(400);
    expect(services.getBreakdown).not.toHaveBeenCalled();
  });

  it("counts every read against the owner's analytics allowance, since each one aggregates a whole window, without touching the database", async () => {
    const enforce = vi.fn();
    vi.mocked(getMemoryRateLimiter).mockReturnValue({ enforce });
    const services = createFakeServices<AnalyticsServices>();
    services.getOverview.mockResolvedValue({} as never);
    vi.mocked(getAnalyticsServices).mockReturnValue(services);

    await app.request("/analytics/overview");
    expect(enforce).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: "analytics-read" }));
  });

  it("answers a repeat request for an unchanged result with a 304 and no body", async () => {
    const services = createFakeServices<AnalyticsServices>();
    services.getOverview.mockResolvedValue({ range: "30d", sent: 12 } as never);
    vi.mocked(getAnalyticsServices).mockReturnValue(services);

    const first = await app.request("/analytics/overview");
    const validator = first.headers.get("etag");
    expect(validator).toBeTruthy();

    const repeat = await app.request("/analytics/overview", { headers: { "if-none-match": validator ?? "" } });
    expect(repeat.status).toBe(304);
    expect(await repeat.text()).toBe("");

    services.getOverview.mockResolvedValue({ range: "30d", sent: 13 } as never);
    expect((await app.request("/analytics/overview", { headers: { "if-none-match": validator ?? "" } })).status).toBe(200);
  });

  it("is for the owner only", async () => {
    vi.mocked(requireDashboardOwner).mockRejectedValue(Object.assign(new Error("Access denied"), { status: 401 }));
    expect((await app.request("/analytics/overview")).status).not.toBe(200);
  });
});
