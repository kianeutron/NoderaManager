import { describe, expect, it } from "vitest";
import { addSignalInputSchema, createProspectInputSchema, prospectChangesSchema, prospectSearchQuerySchema, prospectStatusChangeSchema, updateProspectInputSchema, updateProspectStatusInputSchema } from "@/modules/prospects/domain/prospect.schema";

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("prospect command schemas", () => {
  it("starts a prospect as researched unless told otherwise", () => {
    expect(createProspectInputSchema.parse({ personId: id, routeId: id })).toEqual({ personId: id, routeId: id, status: "researched" });
    expect(createProspectInputSchema.parse({ organizationId: id, routeId: id, status: "ready" }).status).toBe("ready");
  });

  it.each([
    [{ routeId: id }],
    [{ personId: id, routeId: id, status: "contacted" }],
    [{ personId: id, routeId: id, status: "won" }],
    [{ personId: id }],
    [{ personId: id, routeId: id, temperature: "lukewarm" }],
    [{ personId: id, routeId: id, source: "psychic" }]
  ])("rejects a new prospect with %o", (input) => {
    expect(createProspectInputSchema.safeParse(input).success).toBe(false);
  });

  it("requires an update to change something and lets null clear optional fields", () => {
    expect(updateProspectInputSchema.safeParse({ prospectId: id }).success).toBe(false);
    expect(updateProspectInputSchema.parse({ prospectId: id, routeModuleId: null, nextAction: null })).toEqual({ prospectId: id, routeModuleId: null, nextAction: null });
  });

  it("accepts only the documented statuses and structural reasons", () => {
    expect(updateProspectStatusInputSchema.safeParse({ prospectId: id, status: "disqualified", structuralReason: "residency" }).success).toBe(true);
    expect(updateProspectStatusInputSchema.safeParse({ prospectId: id, status: "engaged" }).success).toBe(false);
    expect(updateProspectStatusInputSchema.safeParse({ prospectId: id, status: "disqualified", structuralReason: "vibes" }).success).toBe(false);
  });

  it("parses signal timestamps and refuses one that expires before it was observed", () => {
    const parsed = addSignalInputSchema.parse({ prospectId: id, type: "live_role", summary: "Hiring a CTO", observedAt: "2026-09-01T10:00:00Z", expiresAt: "2026-10-01T10:00:00+02:00" });

    expect(parsed.observedAt).toBeInstanceOf(Date);
    expect(addSignalInputSchema.safeParse({ prospectId: id, type: "live_role", summary: "x", observedAt: "2026-09-02T10:00:00Z", expiresAt: "2026-09-01T10:00:00Z" }).success).toBe(false);
    expect(addSignalInputSchema.safeParse({ prospectId: id, type: "live_role", summary: "x", observedAt: "yesterday" }).success).toBe(false);
  });

  it("filters searches by several statuses and bounds them", () => {
    expect(prospectSearchQuerySchema.parse({ statuses: ["warm", "opportunity"] })).toEqual({ statuses: ["warm", "opportunity"], sort: "updated", limit: 25 });
    expect(prospectSearchQuerySchema.safeParse({ statuses: ["engaged"] }).success).toBe(false);
  });

  it("requires a structural reason exactly when disqualifying, for both the command and the web form", () => {
    for (const schema of [prospectStatusChangeSchema, updateProspectStatusInputSchema]) {
      const input = schema === updateProspectStatusInputSchema ? { prospectId: id } : {};
      expect(schema.safeParse({ ...input, status: "disqualified" }).success).toBe(false);
      expect(schema.safeParse({ ...input, status: "disqualified", structuralReason: "language" }).success).toBe(true);
      expect(schema.safeParse({ ...input, status: "dormant", structuralReason: "language" }).success).toBe(false);
      expect(schema.safeParse({ ...input, status: "dormant" }).success).toBe(true);
    }
  });

  it("takes edits without an id for the web API and still demands a change", () => {
    expect(prospectChangesSchema.parse({ nextAction: null })).toEqual({ nextAction: null });
    expect(prospectChangesSchema.safeParse({}).success).toBe(false);
    expect(prospectChangesSchema.safeParse({ prospectId: id, nextAction: "x" }).success).toBe(false);
  });
});
