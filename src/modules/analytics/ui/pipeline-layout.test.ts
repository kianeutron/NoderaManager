import { describe, expect, it } from "vitest";
import { layoutPipeline } from "@/modules/analytics/ui/pipeline-layout";

const stages = (counts: Record<string, number>) => Object.entries(counts).map(([status, prospects]) => ({ status, prospects })) as Parameters<typeof layoutPipeline>[0];
const size = { width: 400, height: 100 };

describe("layoutPipeline", () => {
  it("sizes each bar to its count against the biggest, centred on one line, and spreads them across the width", () => {
    const { bars } = layoutPipeline(stages({ researched: 10, contacted: 5 }), size);

    expect(bars).toHaveLength(8);
    expect(bars[0]).toMatchObject({ status: "researched", height: 100, y: 0, x: 0 });
    expect(bars[2]).toMatchObject({ status: "contacted", height: 50, y: 25 });
    expect(bars.at(-1)?.x).toBe(400 - 14);
  });

  it("keeps an empty stage visible as a sliver", () => {
    expect(layoutPipeline(stages({ researched: 4 }), size).bars[3]?.height).toBe(6);
  });

  it("draws one ribbon between neighbours, as thick as the thinner bar", () => {
    const { ribbons, bars } = layoutPipeline(stages({ researched: 10, ready: 4 }), size);

    expect(ribbons).toHaveLength(7);
    expect(ribbons[0]).toMatchObject({ from: "researched", to: "ready" });
    expect(ribbons[0]?.path.startsWith(`M${(bars[0]?.x ?? 0) + 14},30 `)).toBe(true);
  });

  it("keeps the ways out apart from the path, and totals every prospect", () => {
    const layout = layoutPipeline(stages({ researched: 2, lost: 3, dormant: 1 }), size);

    expect(layout.exits).toEqual([{ status: "dormant", prospects: 1 }, { status: "lost", prospects: 3 }, { status: "disqualified", prospects: 0 }]);
    expect(layout.total).toBe(6);
  });
});
