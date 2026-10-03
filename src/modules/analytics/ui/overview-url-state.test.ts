import { describe, expect, it } from "vitest";
import { overviewUrlCodec } from "@/modules/analytics/ui/overview-url-state";

describe("overviewUrlCodec", () => {
  it("reads a range, and falls back to 30 days for anything it does not know", () => {
    expect(overviewUrlCodec.parse(new URLSearchParams("range=7d"))).toBe("7d");
    expect(overviewUrlCodec.parse(new URLSearchParams("range=1y"))).toBe("30d");
    expect(overviewUrlCodec.parse(new URLSearchParams())).toBe("30d");
  });

  it("leaves the default out of the URL", () => {
    expect(overviewUrlCodec.serialize("30d")).toBe("");
    expect(overviewUrlCodec.serialize("90d")).toBe("range=90d");
  });
});
