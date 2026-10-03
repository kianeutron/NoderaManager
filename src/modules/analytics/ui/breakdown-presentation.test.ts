import { describe, expect, it } from "vitest";
import { dimensionLabel, rowLabel } from "@/modules/analytics/ui/breakdown-presentation";
import { performanceDimensionValues } from "@/modules/analytics/domain/analytics.schema";

describe("rowLabel", () => {
  it("words records by their name and fixed values by the labels used elsewhere in the app", () => {
    expect(rowLabel("route", { key: "r1", name: "Agency Overflow" })).toBe("Agency Overflow");
    expect(rowLabel("channel", { key: "inmail", name: null })).toBe("LinkedIn InMail");
    expect(rowLabel("persona", { key: "fractional_cto", name: null })).toBe("Fractional CTO");
    expect(rowLabel("source", { key: "referral", name: null })).toBe("Referral");
    expect(rowLabel("country", { key: "DE", name: null })).toBe("Germany");
  });

  it("says so when a dimension is not recorded, per dimension", () => {
    expect(rowLabel("country", { key: null, name: null })).toBe("Country not set");
    expect(rowLabel("campaign", { key: null, name: null })).toBe("No campaign");
  });

  it("shows a value it does not know as it is, and an unknown country code as the code", () => {
    expect(rowLabel("persona", { key: "brand_new", name: null })).toBe("brand_new");
    expect(rowLabel("country", { key: "ZZ", name: null })).toBe("Unknown Region");
    expect(rowLabel("country", { key: "not a code", name: null })).toBe("not a code");
  });

  it("labels every dimension", () => {
    expect(performanceDimensionValues.every((dimension) => dimensionLabel[dimension].length > 0)).toBe(true);
  });
});
