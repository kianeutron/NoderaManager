import { describe, expect, it, vi } from "vitest";
import { getOverview, type OverviewDependencies } from "@/modules/analytics/application/get-overview.service";

const now = new Date("2026-10-01T12:00:00.000Z");
const side = { sent: 0, reached: 0, replied: 0, emailSent: 0, emailBounced: 0 };

function dependencies(overrides: { sent?: { day: string; count: number }[]; replies?: { day: string; count: number }[] } = {}) {
  return {
    activity: {
      sentByBucket: vi.fn().mockResolvedValue(overrides.sent ?? []),
      repliesByBucket: vi.fn().mockResolvedValue(overrides.replies ?? []),
      periodTotals: vi.fn().mockResolvedValue({ current: { ...side, sent: 4, reached: 4, replied: 1 }, previous: { ...side, sent: 5, reached: 2 } })
    },
    overview: {
      prospectsByStatus: vi.fn().mockResolvedValue([{ status: "contacted", prospects: 5 }]),
      depthReached: vi.fn().mockResolvedValue([]),
      awaitingReply: vi.fn().mockResolvedValue({ total: 0, items: [] })
    },
    performance: { breakdown: vi.fn().mockResolvedValue([{ key: "email", name: null, sent: 3, reached: 2, repliedProspects: 1, repliedMessages: 1, bounced: 0, groups: 1 }]) },
    followUps: { getFollowUpSummary: vi.fn().mockResolvedValue({ overdue: 2, next7Days: 0, later: 0, noDate: 0 }), searchFollowUps: vi.fn().mockResolvedValue({ items: [], total: 2, nextCursor: null }) },
    routes: { getRouteOverview: vi.fn().mockResolvedValue([]) },
    campaigns: { searchCampaigns: vi.fn().mockResolvedValue({ items: [], total: 0, nextCursor: null }) }
  };
}
const asDependencies = (deps: ReturnType<typeof dependencies>) => deps as unknown as OverviewDependencies;

describe("getOverview", () => {
  it("takes the window's headline counts from the database and the replies from the per-day series", async () => {
    const deps = dependencies({ replies: [{ day: "2026-09-30", count: 2 }, { day: "2026-09-20", count: 1 }] });
    const overview = await getOverview(asDependencies(deps), { range: "7d" }, now);

    expect(overview.activity).toHaveLength(7);
    expect(overview.from).toBe("2026-09-25");
    expect(overview.to).toBe("2026-10-01");
    expect(overview.totals.sent).toEqual({ current: 4, previous: 5 });
    expect(overview.totals.reached).toEqual({ current: 4, previous: 2 });
    expect(overview.totals.replies).toEqual({ current: 2, previous: 1 });
    expect(overview.totals.replyRate).toEqual({ current: { part: 1, whole: 4 }, previous: { part: 0, whole: 2 } });
  });

  it("always returns the 26-week calendar, whatever the window", async () => {
    const overview = await getOverview(asDependencies(dependencies()), { range: "7d" }, now);

    expect(overview.calendar).toHaveLength(182);
    expect(overview.calendar.at(-1)?.date).toBe("2026-10-01");
  });

  it("reads the channel mix from the channel breakdown, and the rest from the services that own it", async () => {
    const deps = dependencies();
    const overview = await getOverview(asDependencies(deps), { range: "30d" }, now);

    expect(deps.performance.breakdown).toHaveBeenCalledWith({ dimension: "channel", from: new Date("2026-09-02T00:00:00.000Z"), limit: 10 });
    expect(overview.channels[0]).toEqual({ channel: "email", sent: 3, replied: 1 });
    expect(deps.followUps.searchFollowUps).toHaveBeenCalledWith({ status: "active", due: "overdue", sort: "due", limit: 5 });
    expect(deps.routes.getRouteOverview).toHaveBeenCalledWith({ scope: "active" });
    expect(deps.campaigns.searchCampaigns).toHaveBeenCalledWith({ status: "active", scope: "active", sort: "updated", limit: 6 });
    expect(overview.followUps.summary.overdue).toBe(2);
    expect(overview.pipeline).toHaveLength(11);
  });

  it("looks for unanswered messages that are at least 3 and at most 30 days old", async () => {
    const deps = dependencies();
    await getOverview(asDependencies(deps), { range: "30d" }, now);

    expect(deps.overview.awaitingReply).toHaveBeenCalledWith({ since: new Date("2026-09-01T12:00:00.000Z"), before: new Date("2026-09-28T12:00:00.000Z") });
  });
});
