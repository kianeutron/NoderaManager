import { describe, expect, it } from "vitest";
import { toChangeMetadata } from "@/shared/audit/change-metadata";

describe("toChangeMetadata", () => {
  it("records changed fields with before and after values", () => {
    expect(toChangeMetadata({ name: "A", industry: "x" }, { name: "B" })).toEqual({ fields: ["name"], before: { name: "A" }, after: { name: "B" } });
  });

  it("names a redacted field as changed without recording its content", () => {
    const metadata = toChangeMetadata({ notes: "secret plan" }, { notes: "new secret plan" }, ["notes"]);

    expect(metadata).toEqual({ fields: ["notes"], before: {}, after: {} });
    expect(JSON.stringify(metadata)).not.toContain("secret");
  });
});
