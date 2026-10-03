import { describe, expect, it } from "vitest";
import { maxResponseDepth, outreachChannelValues, prospectStatusValues, responseDepthLabels } from "@/shared/db/schema/crm-values";

describe("CRM value lists", () => {
  it("follows the documented prospect lifecycle in order", () => {
    expect(prospectStatusValues).toEqual(["researched", "ready", "contacted", "replied", "warm", "opportunity", "proposal", "won", "lost", "dormant", "disqualified"]);
  });

  it("treats channels as a separate dimension from routes", () => {
    expect(outreachChannelValues).toEqual(["email", "linkedin", "inmail", "other"]);
    expect(outreachChannelValues).not.toContain("referral");
    expect(outreachChannelValues).not.toContain("community");
  });

  it("defines nine response depths, deepest last, and the maximum matches the list", () => {
    expect(responseDepthLabels).toHaveLength(9);
    expect(responseDepthLabels[0]).toBe("acknowledgement");
    expect(responseDepthLabels.at(-1)).toBe("paid_work");
    expect(maxResponseDepth).toBe(9);
  });
});
