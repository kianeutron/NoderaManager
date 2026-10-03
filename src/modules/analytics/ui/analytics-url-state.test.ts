import { describe, expect, it } from "vitest";
import { analyticsUrlCodec } from "@/modules/analytics/ui/analytics-url-state";

describe("analyticsUrlCodec", () => {
  it("reads the window and the split, each falling back on its own", () => {
    expect(analyticsUrlCodec.parse(new URLSearchParams("range=365d&by=country"))).toEqual({ range: "365d", by: "country" });
    expect(analyticsUrlCodec.parse(new URLSearchParams("range=2y&by=country"))).toEqual({ range: "90d", by: "country" });
    expect(analyticsUrlCodec.parse(new URLSearchParams("range=30d&by=password"))).toEqual({ range: "30d", by: "route" });
    expect(analyticsUrlCodec.parse(new URLSearchParams())).toEqual({ range: "90d", by: "route" });
  });

  it("leaves defaults out of the URL", () => {
    expect(analyticsUrlCodec.serialize({ range: "90d", by: "route" })).toBe("");
    expect(analyticsUrlCodec.serialize({ range: "30d", by: "route" })).toBe("range=30d");
    expect(analyticsUrlCodec.serialize({ range: "90d", by: "persona" })).toBe("by=persona");
    expect(analyticsUrlCodec.serialize({ range: "7d", by: "channel" })).toBe("range=7d&by=channel");
  });
});
