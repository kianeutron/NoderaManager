import { describe, expect, it } from "vitest";
import { describeSignInError } from "@/modules/auth/ui/sign-in-errors";

describe("describeSignInError", () => {
  it("has nothing to say without an error code", () => {
    expect(describeSignInError(undefined)).toBeNull();
    expect(describeSignInError("")).toBeNull();
  });

  it("words a cancelled consent screen", () => {
    expect(describeSignInError("access_denied")).toMatch(/cancelled/);
  });

  it("never echoes an unrecognised code back", () => {
    const message = describeSignInError("<script>alert(1)</script>");
    expect(message).toBe("Sign-in didn't complete. Try again.");
    expect(message).not.toMatch(/script/);
  });
});
