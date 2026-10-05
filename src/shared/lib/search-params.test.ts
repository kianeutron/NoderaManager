import { describe, expect, it } from "vitest";
import { toUrlSearchParams } from "@/shared/lib/search-params";

describe("toUrlSearchParams", () => {
  it("keeps single values, repeated values, and leaves out what is missing", () => {
    const params = toUrlSearchParams({ range: "7d", tag: ["a", "b"], empty: undefined });

    expect(params.get("range")).toBe("7d");
    expect(params.getAll("tag")).toEqual(["a", "b"]);
    expect(params.has("empty")).toBe(false);
  });
});
