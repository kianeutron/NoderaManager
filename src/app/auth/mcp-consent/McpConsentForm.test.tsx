import { describe, expect, it } from "vitest";
import { getConsentRedirect } from "@/app/auth/mcp-consent/McpConsentForm";

describe("McpConsentForm", () => {
  it("accepts Better Auth's redirect response", () => {
    expect(getConsentRedirect({ redirect: true, url: "/oauth/callback?code=test" })).toBe("/oauth/callback?code=test");
  });

  it("rejects malformed consent responses", () => {
    expect(getConsentRedirect({ redirect_uri: "/oauth/callback?code=test" })).toBeNull();
    expect(getConsentRedirect({ redirect: true })).toBeNull();
    expect(getConsentRedirect(null)).toBeNull();
  });
});
