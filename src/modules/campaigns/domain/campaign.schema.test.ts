import { describe, expect, it } from "vitest";
import { campaignChangesSchema, campaignProspectsBodySchema, campaignRoutesBodySchema, campaignSearchQuerySchema, campaignSuggestionsQuerySchema, createCampaignInputSchema, setCampaignStatusInputSchema, targetingRulesSchema, updateCampaignInputSchema } from "@/modules/campaigns/domain/campaign.schema";

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const moduleId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const campaignId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d92";

describe("targetingRulesSchema", () => {
  it("defaults every list to empty, reads an old empty value, and normalizes countries and duplicates", () => {
    expect(targetingRulesSchema.parse({})).toEqual({ personas: [], countries: [], organizationTypes: [] });
    expect(targetingRulesSchema.parse({ personas: ["recruiter", "recruiter"], countries: ["de", "DE", "nl"] })).toEqual({ personas: ["recruiter"], countries: ["DE", "NL"], organizationTypes: [] });
  });

  it.each([["an unknown persona", { personas: ["wizard"] }], ["a bad country", { countries: ["Germany"] }], ["an unknown company type", { organizationTypes: ["fund"] }], ["an unknown rule", { salary: 100 }]])("rejects %s", (_case, rules) => {
    expect(targetingRulesSchema.safeParse(rules).success).toBe(false);
  });
});

describe("createCampaignInputSchema", () => {
  it("needs only a name, and starts empty", () => {
    expect(createCampaignInputSchema.parse({ name: "  Q4   agencies " })).toEqual({ name: "Q4 agencies", targetingRules: { personas: [], countries: [], organizationTypes: [] }, routes: [] });
  });

  it("lists the same route and module only once, and caps the list", () => {
    const { routes } = createCampaignInputSchema.parse({ name: "x", routes: [{ routeId }, { routeId }, { routeId, routeModuleId: moduleId }] });
    expect(routes).toEqual([{ routeId }, { routeId, routeModuleId: moduleId }]);
    expect(createCampaignInputSchema.safeParse({ name: "x", routes: Array.from({ length: 21 }, (_, index) => ({ routeId, routeModuleId: `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d${String(index).padStart(2, "0")}` })) }).success).toBe(false);
  });

  it("keeps the end on or after the start, reads dates as instants, and refuses unknown fields", () => {
    const window = createCampaignInputSchema.parse({ name: "x", startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z" });
    expect(window.endsAt).toEqual(new Date("2026-12-01T00:00:00Z"));
    expect(createCampaignInputSchema.safeParse({ name: "x", startsAt: "2026-12-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" }).success).toBe(false);
    expect(createCampaignInputSchema.safeParse({ name: "x", status: "active" }).success).toBe(false);
  });
});

describe("campaign changes", () => {
  it("demands a change, for the command and the web body, and lets null clear", () => {
    expect(campaignChangesSchema.safeParse({}).success).toBe(false);
    expect(updateCampaignInputSchema.safeParse({ campaignId }).success).toBe(false);
    expect(campaignChangesSchema.parse({ goal: null, endsAt: null })).toEqual({ goal: null, endsAt: null });
  });

  it("takes the id only in the command, and has no route or status field of its own", () => {
    expect(campaignChangesSchema.safeParse({ campaignId, name: "x" }).success).toBe(false);
    expect(campaignChangesSchema.safeParse({ status: "active" }).success).toBe(false);
    expect(campaignChangesSchema.safeParse({ routes: [] }).success).toBe(false);
  });
});

describe("the other campaign inputs", () => {
  it("takes a status the database knows, nothing else", () => {
    expect(setCampaignStatusInputSchema.safeParse({ campaignId, status: "paused" }).success).toBe(true);
    expect(setCampaignStatusInputSchema.safeParse({ campaignId, status: "cancelled" }).success).toBe(false);
  });

  it("takes 1 to 50 distinct prospects", () => {
    expect(campaignProspectsBodySchema.parse({ prospectIds: [routeId, routeId, moduleId] }).prospectIds).toEqual([routeId, moduleId]);
    expect(campaignProspectsBodySchema.safeParse({ prospectIds: [] }).success).toBe(false);
    expect(campaignProspectsBodySchema.safeParse({ prospectIds: Array.from({ length: 51 }, (_, index) => `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8${String(index).padStart(3, "0")}`) }).success).toBe(false);
  });

  it("takes an empty route list to clear the routes", () => {
    expect(campaignRoutesBodySchema.parse({ routes: [] })).toEqual({ routes: [] });
  });

  it("defaults the search to active campaigns, newest first, 25 a page, and bounds the suggestions", () => {
    expect(campaignSearchQuerySchema.parse({})).toEqual({ scope: "active", sort: "updated", limit: 25 });
    expect(campaignSearchQuerySchema.safeParse({ cursor: "garbage" }).success).toBe(false);
    expect(campaignSuggestionsQuerySchema.parse({})).toEqual({ limit: 25 });
    expect(campaignSuggestionsQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
  });
});
