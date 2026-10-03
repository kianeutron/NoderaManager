import { describe, expect, it } from "vitest";
import { assertHasRoutes, assertNotFinished, assertNotRunning, assertTransition, matchesTargetingRules, routeMatchesCampaign } from "@/modules/campaigns/domain/campaign-rules";
import { emptyTargetingRules } from "@/modules/campaigns/domain/campaign.schema";
import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";

describe("assertTransition", () => {
  it.each([["draft", "active"], ["active", "paused"], ["active", "completed"], ["paused", "active"], ["paused", "completed"]] as const)("allows %s to %s", (from, to) => {
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each([["draft", "paused"], ["draft", "completed"], ["active", "draft"], ["paused", "draft"], ["completed", "active"], ["completed", "draft"], ["completed", "paused"]] as const)("refuses %s to %s", (from, to) => {
    expect(() => assertTransition(from, to)).toThrowError(expect.objectContaining({ code: "conflict", reason: "campaign_transition_invalid" }));
  });
});

describe("assertHasRoutes", () => {
  it("lets a draft be empty but not a campaign that runs or is paused", () => {
    expect(() => assertHasRoutes("draft", 0)).not.toThrow();
    for (const status of ["active", "paused"] as const) expect(() => assertHasRoutes(status, 0)).toThrowError(expect.objectContaining({ reason: "campaign_needs_route" }));
    for (const status of ["draft", "active", "paused"] as const) expect(() => assertHasRoutes(status, 1)).not.toThrow();
  });
});

describe("assertNotFinished and assertNotRunning", () => {
  it("refuses changes to a completed campaign only", () => {
    for (const status of ["draft", "active", "paused"] as const) expect(() => assertNotFinished(status)).not.toThrow();
    expect(() => assertNotFinished("completed")).toThrowError(expect.objectContaining({ reason: "campaign_finished" }));
  });

  it("refuses to archive a campaign that is running, and nothing else", () => {
    expect(() => assertNotRunning("active")).toThrowError(expect.objectContaining({ reason: "campaign_running" }));
    for (const status of ["draft", "paused", "completed"] as const satisfies readonly CampaignStatus[]) expect(() => assertNotRunning(status)).not.toThrow();
  });
});

describe("routeMatchesCampaign", () => {
  const wholeRoute = { routeId: "r1", routeModuleId: null };
  const oneModule = { routeId: "r2", routeModuleId: "m1" };

  it("lets any prospect in a campaign with no routes yet", () => {
    expect(routeMatchesCampaign({ routeId: "anything", routeModuleId: null }, [])).toBe(true);
  });

  it("covers every module of a whole-route entry, including none", () => {
    expect(routeMatchesCampaign({ routeId: "r1", routeModuleId: "m9" }, [wholeRoute])).toBe(true);
    expect(routeMatchesCampaign({ routeId: "r1", routeModuleId: null }, [wholeRoute])).toBe(true);
  });

  it("covers only the named module of a module entry", () => {
    expect(routeMatchesCampaign({ routeId: "r2", routeModuleId: "m1" }, [oneModule])).toBe(true);
    expect(routeMatchesCampaign({ routeId: "r2", routeModuleId: "m2" }, [oneModule])).toBe(false);
    expect(routeMatchesCampaign({ routeId: "r2", routeModuleId: null }, [oneModule])).toBe(false);
  });

  it("refuses a route that is not listed, and accepts any listed entry", () => {
    expect(routeMatchesCampaign({ routeId: "r3", routeModuleId: null }, [wholeRoute, oneModule])).toBe(false);
    expect(routeMatchesCampaign({ routeId: "r2", routeModuleId: "m1" }, [wholeRoute, oneModule])).toBe(true);
  });
});

describe("matchesTargetingRules", () => {
  const prospect = { persona: "recruiter", countryCodes: ["DE", null], organizationType: "agency" };

  it("matches anyone when there are no rules", () => {
    expect(matchesTargetingRules(emptyTargetingRules, { persona: null, countryCodes: [], organizationType: null })).toBe(true);
  });

  it("needs each non-empty list to match, and any value inside a list", () => {
    expect(matchesTargetingRules({ ...emptyTargetingRules, personas: ["recruiter", "founder"] }, prospect)).toBe(true);
    expect(matchesTargetingRules({ ...emptyTargetingRules, personas: ["founder"] }, prospect)).toBe(false);
    expect(matchesTargetingRules({ personas: ["recruiter"], countries: ["DE"], organizationTypes: ["agency"] }, prospect)).toBe(true);
    expect(matchesTargetingRules({ personas: ["recruiter"], countries: ["FR"], organizationTypes: ["agency"] }, prospect)).toBe(false);
  });

  it("matches a country on the person or on the company, and fails a rule the prospect has no value for", () => {
    expect(matchesTargetingRules({ ...emptyTargetingRules, countries: ["NL"] }, { ...prospect, countryCodes: [null, "NL"] })).toBe(true);
    expect(matchesTargetingRules({ ...emptyTargetingRules, countries: ["NL"] }, { ...prospect, countryCodes: [null, null] })).toBe(false);
    expect(matchesTargetingRules({ ...emptyTargetingRules, personas: ["recruiter"] }, { ...prospect, persona: null })).toBe(false);
    expect(matchesTargetingRules({ ...emptyTargetingRules, organizationTypes: ["agency"] }, { ...prospect, organizationType: null })).toBe(false);
  });
});
