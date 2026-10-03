import { describe, expect, it } from "vitest";
import { fingerprintOf } from "@/shared/idempotency/fingerprint";

describe("fingerprintOf", () => {
  it("is the same for the same parts and different when any part or its order differs", () => {
    expect(fingerprintOf(["a", "email", null, "hi"])).toBe(fingerprintOf(["a", "email", null, "hi"]));
    expect(fingerprintOf(["a", "email", null, "hi"])).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprintOf(["a", "email", null, "hi"])).not.toBe(fingerprintOf(["a", "email", null, "hello"]));
    expect(fingerprintOf(["a", "b"])).not.toBe(fingerprintOf(["b", "a"]));
    expect(fingerprintOf(["a", null])).not.toBe(fingerprintOf(["a", "null"]));
  });
});
