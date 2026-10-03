import { describe, expect, it, vi } from "vitest";
import { getBreakdown } from "@/modules/analytics/application/get-breakdown.service";

const now = new Date("2026-10-01T12:00:00.000Z");
const row = { key: "r1", name: "Agencies", sent: 5, reached: 4, repliedProspects: 2, repliedMessages: 2, bounced: 0, groups: 3 };

describe("getBreakdown", () => {
  it("asks for the chosen dimension over the window, and reports how many groups there are in all", async () => {
    const performance = { breakdown: vi.fn().mockResolvedValue([row]) };
    const result = await getBreakdown(performance, { range: "30d", by: "country", limit: 10 }, now);

    expect(performance.breakdown).toHaveBeenCalledWith({ dimension: "country", from: new Date("2026-09-02T00:00:00.000Z"), limit: 10 });
    expect(result).toMatchObject({ dimension: "country", range: "30d", days: 30, from: "2026-09-02", to: "2026-10-01", groups: 3 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).not.toHaveProperty("groups");
  });

  it("returns no rows and no groups when nothing was sent", async () => {
    const result = await getBreakdown({ breakdown: vi.fn().mockResolvedValue([]) }, { range: "7d", by: "route", limit: 25 }, now);
    expect(result).toMatchObject({ rows: [], groups: 0 });
  });
});
