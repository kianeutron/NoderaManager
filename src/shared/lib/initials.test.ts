import { describe, expect, it } from "vitest";
import { initialsOf } from "@/shared/lib/initials";

describe("initialsOf", () => {
  it("uses the first and last word", () => {
    expect(initialsOf("Marta Chen")).toBe("MC");
    expect(initialsOf("  julian   de la  park ")).toBe("JP");
  });

  it("copes with one word and with nothing", () => {
    expect(initialsOf("Bluewave")).toBe("B");
    expect(initialsOf("   ")).toBe("?");
  });
});
