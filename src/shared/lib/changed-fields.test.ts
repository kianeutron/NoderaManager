import { describe, expect, it } from "vitest";
import { pickChangedFields } from "@/shared/lib/changed-fields";

const current = { name: "Acme", industry: "SaaS", notes: null as string | null };

// Real inputs come from Zod partial schemas: every key exists, and omitted ones are undefined.
type Input = { name?: string | undefined; industry?: string | undefined; notes?: string | null | undefined };
const input = (values: Input): Input => values;

describe("pickChangedFields", () => {
  it("keeps only supplied values that differ", () => {
    expect(pickChangedFields(current, input({ name: "Acme", industry: "Fintech" }), ["name", "industry", "notes"])).toEqual({ industry: "Fintech" });
  });

  it("treats undefined as unchanged and null as a real value", () => {
    expect(pickChangedFields(current, input({ industry: undefined }), ["industry"])).toEqual({});
    expect(pickChangedFields({ ...current, notes: "x" }, input({ notes: null }), ["notes"])).toEqual({ notes: null });
  });

  it("ignores keys that were not asked for", () => {
    expect(pickChangedFields(current, input({ name: "Other", industry: "Fintech" }), ["industry"])).toEqual({ industry: "Fintech" });
  });
});
