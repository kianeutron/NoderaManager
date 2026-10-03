import { describe, expect, it } from "vitest";
import { isOwnerEmail } from "@/shared/auth/owner-policy";

describe("isOwnerEmail", () => {
  it("compares normalized email addresses", () => {
    expect(isOwnerEmail(" KIAN@EXAMPLE.COM ", "kian@example.com")).toBe(true);
  });

  it("rejects another identity", () => {
    expect(isOwnerEmail("other@example.com", "kian@example.com")).toBe(false);
  });
});
