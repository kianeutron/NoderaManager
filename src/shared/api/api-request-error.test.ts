import { describe, expect, it } from "vitest";
import { ApiRequestError, shouldRetryRequest } from "@/shared/api/api-request-error";

describe("shouldRetryRequest", () => {
  it("never retries a client error", () => {
    expect(shouldRetryRequest(0, new ApiRequestError(404))).toBe(false);
    expect(shouldRetryRequest(0, new ApiRequestError(400))).toBe(false);
  });

  it("retries server and network failures, twice at most", () => {
    expect(shouldRetryRequest(0, new ApiRequestError(500))).toBe(true);
    expect(shouldRetryRequest(1, new TypeError("network"))).toBe(true);
    expect(shouldRetryRequest(2, new ApiRequestError(503))).toBe(false);
  });
});
