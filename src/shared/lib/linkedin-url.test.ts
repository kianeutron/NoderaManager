import { describe, expect, it } from "vitest";
import { normalizeLinkedInUrl } from "@/shared/lib/linkedin-url";

describe("normalizeLinkedInUrl", () => {
  it("removes the non-identity parts of a profile URL", () => {
    expect(normalizeLinkedInUrl("https://www.linkedin.com/in/Marta-Chen/?utm_source=app#contact")).toBe("https://linkedin.com/in/marta-chen");
    expect(normalizeLinkedInUrl("https://linkedin.com/company/Bluewave/")).toBe("https://linkedin.com/company/bluewave");
  });

  it("rejects other hosts, including look-alikes", () => {
    expect(() => normalizeLinkedInUrl("https://example.com/in/marta")).toThrow("LinkedIn URLs");
    expect(() => normalizeLinkedInUrl("https://linkedin.com.evil.io/in/marta")).toThrow("LinkedIn URLs");
  });
});
