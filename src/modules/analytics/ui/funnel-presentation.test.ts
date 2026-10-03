import { describe, expect, it } from "vitest";
import { describeFunnel } from "@/modules/analytics/ui/funnel-presentation";

const steps = [{ step: "reached", prospects: 20 }, { step: "replied", prospects: 5 }, { step: "engaged", prospects: 2 }, { step: "conversation", prospects: 0 }, { step: "commercial", prospects: 0 }] as const;

describe("describeFunnel", () => {
  it("gives each step its share of everyone messaged and of the step before", () => {
    const rows = describeFunnel(steps);

    expect(rows[0]).toMatchObject({ label: "Messaged", prospects: 20, ofReached: 1, ofPrevious: null });
    expect(rows[1]).toMatchObject({ prospects: 5, ofReached: 0.25, ofPrevious: 0.25 });
    expect(rows[2]).toMatchObject({ prospects: 2, ofReached: 0.1, ofPrevious: 0.4 });
  });

  it("does not divide by an empty step", () => {
    const rows = describeFunnel(steps);
    expect(rows[4]).toMatchObject({ ofReached: 0, ofPrevious: 0 });
    expect(describeFunnel([])).toEqual([]);
  });
});
