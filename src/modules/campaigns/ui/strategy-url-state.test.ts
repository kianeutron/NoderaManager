import { describe, expect, it } from "vitest";
import { defaultStrategyState, hasActiveFilters, strategyUrlCodec } from "@/modules/campaigns/ui/strategy-url-state";

const id = "0b0e6a0e-5b52-4b3b-9a53-3f1d5a1f3c11";
const parse = (query: string) => strategyUrlCodec.parse(new URLSearchParams(query));

describe("strategy url state", () => {
  it("parses an empty query to the defaults and serializes them to nothing", () => {
    expect(parse("")).toEqual(defaultStrategyState);
    expect(strategyUrlCodec.serialize(defaultStrategyState)).toBe("");
  });

  it("round-trips a full state", () => {
    const state = { view: "campaigns", q: "q4", campaignStatus: "paused", scope: "archived", selectedId: id } as const;
    expect(parse(strategyUrlCodec.serialize(state))).toEqual(state);
  });

  it("drops only the invalid parameters", () => {
    expect(parse("view=nope&status=open&scope=all&id=nope&q=q4")).toEqual({ ...defaultStrategyState, q: "q4" });
  });

  it("counts filters per view, never the open record, and lets scope apply to both", () => {
    expect(hasActiveFilters({ ...defaultStrategyState, selectedId: id })).toBe(false);
    expect(hasActiveFilters({ ...defaultStrategyState, scope: "archived" })).toBe(true);
    expect(hasActiveFilters({ ...defaultStrategyState, view: "campaigns", campaignStatus: "active" })).toBe(true);
    expect(hasActiveFilters({ ...defaultStrategyState, view: "routes", q: "x" })).toBe(false);
  });
});
