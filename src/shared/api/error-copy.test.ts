import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { describeError, isSessionExpired } from "@/shared/api/error-copy";
import { applicationReasons } from "@/shared/errors/error-reasons";

describe("describeError", () => {
  it("words every reason the server can send", () => {
    for (const reason of applicationReasons) {
      const copy = describeError(new ApiRequestError(409, { reason }));
      expect(copy).toMatch(/[a-z]/i);
      expect(copy).not.toContain(reason);
    }
  });

  it.each([
    [401, "session has expired"], [403, "don't have access"], [404, "That person no longer exists"], [409, "conflicts"], [429, "too quickly"], [503, "temporarily unavailable"], [400, "not valid"]
  ])("words status %s without technical text", (status, expected) => {
    expect(describeError(new ApiRequestError(status), "person")).toContain(expected);
  });

  it("gives a server fault a reference and no internals", () => {
    const copy = describeError(new ApiRequestError(500, { code: "INTERNAL_ERROR", requestId: "req-42" }));
    expect(copy).toContain("Reference: req-42");
    expect(copy).not.toMatch(/500|INTERNAL/);
  });

  it("explains a request that never got an answer", () => {
    expect(describeError(new TypeError("Failed to fetch"))).toBe("Could not reach the server. Check your connection and try again.");
  });

  it("falls back to a safe sentence for anything unknown, never the raw message", () => {
    expect(describeError(new Error("SELECT * FROM people"))).toBe("Something went wrong. Try again.");
    expect(describeError("boom")).toBe("Something went wrong. Try again.");
  });

  it("recognises an ended session", () => {
    expect(isSessionExpired(new ApiRequestError(401))).toBe(true);
    expect(isSessionExpired(new ApiRequestError(403))).toBe(false);
  });
});
