import { describe, expect, it } from "vitest";
import { defaultWorkspaceState, hasActiveFilters, workspaceUrlCodec } from "@/modules/people/ui/people-workspace-url-state";

const id = "0b0e6a0e-5b52-4b3b-9a53-3f1d5a1f3c11";
const parse = (query: string) => workspaceUrlCodec.parse(new URLSearchParams(query));

describe("workspace url state", () => {
  it("parses an empty query to the defaults", () => {
    expect(parse("")).toEqual(defaultWorkspaceState);
  });

  it("round-trips a full state", () => {
    const state = { view: "people", q: "ada", sort: "name", scope: "archived", persona: "recruiter", organizationId: id, organizationType: undefined, selectedId: id } as const;
    expect(parse(workspaceUrlCodec.serialize(state))).toEqual(state);
  });

  it("omits defaults from the URL", () => {
    expect(workspaceUrlCodec.serialize(defaultWorkspaceState)).toBe("");
  });

  it("drops only the invalid parameters", () => {
    expect(parse(`view=nope&persona=wizard&sort=name&id=not-a-uuid&q=ada`)).toEqual({ ...defaultWorkspaceState, sort: "name", q: "ada" });
  });

  it("counts filters per view", () => {
    expect(hasActiveFilters({ ...defaultWorkspaceState, persona: "recruiter" })).toBe(true);
    expect(hasActiveFilters({ ...defaultWorkspaceState, view: "companies", persona: "recruiter" })).toBe(false);
    expect(hasActiveFilters({ ...defaultWorkspaceState, view: "companies", organizationType: "agency" })).toBe(true);
    expect(hasActiveFilters({ ...defaultWorkspaceState, scope: "archived" })).toBe(true);
  });
});
