import { describe, expect, it } from "vitest";
import { campaignNextSteps, describeWindow } from "@/modules/campaigns/ui/campaign-presentation";

describe("describeWindow", () => {
  it.each([
    ["2026-10-01T12:00:00Z", "2026-12-01T12:00:00Z", /Oct 1, 2026 to Dec 1, 2026/],
    ["2026-10-01T12:00:00Z", null, /^From Oct 1, 2026/],
    [null, "2026-12-01T12:00:00Z", /^Until Dec 1, 2026/],
    [null, null, /^No dates$/]
  ])("%s / %s", (startsAt, endsAt, expected) => {
    expect(describeWindow(startsAt, endsAt)).toMatch(expected);
  });
});

describe("campaignNextSteps", () => {
  it("offers exactly the moves the lifecycle allows, and only completing asks first", () => {
    expect(campaignNextSteps.draft.map((step) => step.to)).toEqual(["active"]);
    expect(campaignNextSteps.active.map((step) => step.to)).toEqual(["paused", "completed"]);
    expect(campaignNextSteps.paused.map((step) => step.to)).toEqual(["active", "completed"]);
    expect(campaignNextSteps.completed).toEqual([]);
    for (const steps of Object.values(campaignNextSteps)) for (const step of steps) expect(step.confirm).toBe(step.to === "completed");
  });
});
