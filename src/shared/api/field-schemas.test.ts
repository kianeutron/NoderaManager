import { describe, expect, it } from "vitest";
import { displayNameSchema, httpUrlSchema, isoCountryCodeSchema, linkedInUrlSchema } from "@/shared/api/field-schemas";

describe("shared field schemas", () => {
  it("normalizes country codes to uppercase and rejects anything but two letters", () => {
    expect(isoCountryCodeSchema.parse(" de ")).toBe("DE");
    for (const invalid of ["D", "DEU", "1A", "D-"]) expect(isoCountryCodeSchema.safeParse(invalid).success, invalid).toBe(false);
  });

  it("accepts only http(s) URLs", () => {
    expect(httpUrlSchema.safeParse("https://bluewave.io").success).toBe(true);
    for (const invalid of ["javascript:alert(1)", "ftp://x.io", "not a url"]) expect(httpUrlSchema.safeParse(invalid).success, invalid).toBe(false);
  });

  it("accepts LinkedIn URLs as entered and rejects other hosts", () => {
    expect(linkedInUrlSchema.parse("https://www.linkedin.com/in/Marta-Chen/")).toBe("https://www.linkedin.com/in/Marta-Chen/");
    expect(linkedInUrlSchema.safeParse("https://example.com/in/marta").success).toBe(false);
  });

  it("collapses whitespace in display names and enforces the length", () => {
    expect(displayNameSchema(10).parse("  Marta   Chen ")).toBe("Marta Chen");
    expect(displayNameSchema(5).safeParse("Marta Chen").success).toBe(false);
    expect(displayNameSchema(5).safeParse("   ").success).toBe(false);
  });
});
