import { describe, expect, it } from "vitest";
import { normalizeEmail } from "@/modules/people/domain/identity-normalization";

describe("person identity normalization", () => {
  it("normalizes an email without changing meaningful local-part content", () => {
    expect(normalizeEmail("  Name+label@EXAMPLE.com ")).toBe("name+label@example.com");
  });
});
