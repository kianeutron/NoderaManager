import { describe, expect, it } from "vitest";
import { campaignChangesSchema, createCampaignInputSchema } from "@/modules/campaigns/domain/campaign.schema";
import type { CampaignDetail } from "@/modules/campaigns/domain/campaign.types";
import { campaignToFormValues, emptyCampaignForm, mergeChoices, routeChoicesOf, routeKey, toCampaignChanges, toCampaignEditValidationInput, toCreateCampaignInput, toRouteChoices, toRouteEntries, toRoutesChange, type CampaignFormValues } from "@/modules/campaigns/ui/campaign-form";

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const moduleId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const saved: CampaignDetail = {
  id: "c1", name: "Q4 agencies", status: "draft", goal: "Get 5 calls", startsAt: new Date(2026, 9, 1, 9, 0).toISOString(), endsAt: new Date(2026, 11, 1, 9, 0).toISOString(), archivedAt: null, updatedAt: "2026-09-01T00:00:00.000Z",
  routes: [{ routeId, routeName: "Agency Overflow", moduleId: null, moduleName: null }, { routeId, routeName: "Agency Overflow", moduleId, moduleName: "UX studios" }],
  stats: { members: 0, contacted: 0, won: 0, messages: 0, replies: 0 }, targetingRules: { personas: ["recruiter"], countries: ["DE"], organizationTypes: [] }
};
const initial = campaignToFormValues(saved);

describe("route choices", () => {
  it("lists each route and, under it, each of its modules, with a key that round-trips", () => {
    const choices = toRouteChoices([{ id: routeId, name: "Agency Overflow", description: null, modules: [{ id: moduleId, name: "UX studios", description: null }] }]);
    expect(choices).toEqual([{ value: routeId, label: "Agency Overflow" }, { value: `${routeId}:${moduleId}`, label: "Agency Overflow · UX studios" }]);
    expect(toRouteEntries([routeKey(routeId, null), routeKey(routeId, moduleId)])).toEqual([{ routeId }, { routeId, routeModuleId: moduleId }]);
  });

  it("keeps the name of a route that is no longer in the catalog, without repeating ones that are", () => {
    const fromCatalog = [{ value: routeId, label: "Agency Overflow" }];
    expect(mergeChoices(fromCatalog, routeChoicesOf(saved.routes)).map((choice) => choice.label)).toEqual(["Agency Overflow", "Agency Overflow · UX studios"]);
  });
});

describe("toCreateCampaignInput", () => {
  it("maps a name-only form to a valid draft, with empty rules and no routes", () => {
    const input = createCampaignInputSchema.parse(toCreateCampaignInput({ ...emptyCampaignForm, name: "  Q4 agencies " }));
    expect(input).toEqual({ name: "Q4 agencies", targetingRules: { personas: [], countries: [], organizationTypes: [] }, routes: [] });
  });

  it("maps the window, the rules and the routes", () => {
    const input = createCampaignInputSchema.parse(toCreateCampaignInput(initial));
    expect(input).toMatchObject({ goal: "Get 5 calls", startsAt: new Date(2026, 9, 1, 9, 0), targetingRules: { personas: ["recruiter"], countries: ["DE"] }, routes: [{ routeId }, { routeId, routeModuleId: moduleId }] });
  });
});

describe("editing", () => {
  it("round-trips the saved values to the minute and sends nothing", () => {
    expect(initial).toMatchObject({ name: "Q4 agencies", startsAt: "2026-10-01T09:00", endsAt: "2026-12-01T09:00", personas: ["recruiter"], countries: ["DE"], routes: [routeId, `${routeId}:${moduleId}`] });
    expect(toCampaignChanges(initial, initial)).toEqual({});
    expect(toRoutesChange(initial, initial)).toBeNull();
  });

  it("sends only what changed, with null to clear, and the whole rules when any list changed", () => {
    const edited: CampaignFormValues = { ...initial, goal: "", endsAt: "", countries: ["DE", "NL"] };
    expect(toCampaignChanges(edited, initial)).toEqual({ goal: null, endsAt: null, targetingRules: { personas: ["recruiter"], countries: ["DE", "NL"], organizationTypes: [] } });
  });

  it("changes the routes only when the set differs, in any order", () => {
    expect(toRoutesChange({ ...initial, routes: [`${routeId}:${moduleId}`, routeId] }, initial)).toBeNull();
    expect(toRoutesChange({ ...initial, routes: [routeId] }, initial)).toEqual([{ routeId }]);
  });

  it("validates the window in full, so an end before the untouched start is caught", () => {
    expect(campaignChangesSchema.safeParse(toCampaignEditValidationInput({ ...initial, endsAt: "2026-09-01T09:00" }, initial)).success).toBe(false);
    expect(campaignChangesSchema.safeParse(toCampaignEditValidationInput({ ...initial, endsAt: "2027-01-01T09:00" }, initial)).success).toBe(true);
  });
});
