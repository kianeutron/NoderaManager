import { describe, expect, it, vi } from "vitest";
import { addSignal } from "@/modules/prospects/application/add-signal.service";
import { createProspect } from "@/modules/prospects/application/create-prospect.service";
import { updateProspectStatus } from "@/modules/prospects/application/update-prospect-status.service";
import { updateProspect } from "@/modules/prospects/application/update-prospect.service";
import { addSignalInputSchema, createProspectInputSchema, updateProspectInputSchema, updateProspectStatusInputSchema } from "@/modules/prospects/domain/prospect.schema";
import { createActor } from "@/test/factories/actors";

const id = (suffix: string) => `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d${suffix}`;
const prospectId = id("90");
const routeId = id("01");
const otherRouteId = id("02");
const moduleId = id("03");
const personId = id("04");
const organizationId = id("05");

function routesFake(overrides: { route?: unknown; module?: unknown } = {}) {
  return {
    findRoute: vi.fn().mockResolvedValue("route" in overrides ? overrides.route : { id: routeId, name: "Referral partners", archivedAt: null }),
    findModule: vi.fn().mockResolvedValue("module" in overrides ? overrides.module : { id: moduleId, routeId, name: "UX studios", archivedAt: null })
  };
}

describe("createProspect", () => {
  function createDependencies(overrides: { person?: unknown; organization?: unknown; open?: unknown; routes?: ReturnType<typeof routesFake> } = {}) {
    return {
      reads: { findOpenProspect: vi.fn().mockResolvedValue(overrides.open ?? null) },
      people: { findPerson: vi.fn().mockResolvedValue("person" in overrides ? overrides.person : { id: personId, fullName: "Marta Chen", doNotContactAt: null, doNotContactReason: null }) },
      organizations: { findOrganization: vi.fn().mockResolvedValue("organization" in overrides ? overrides.organization : { id: organizationId }) },
      routes: overrides.routes ?? routesFake(),
      commands: { insertProspect: vi.fn().mockResolvedValue("audit-1") }
    };
  }
  const parse = (fields: Record<string, unknown> = {}) => createProspectInputSchema.parse({ personId, routeId, ...fields });

  it("creates a researched prospect and audits it without the qualification text", async () => {
    const dependencies = createDependencies();
    const result = await createProspect(dependencies, createActor(), parse({ routeModuleId: moduleId, whyTargeted: "Runs a UX studio needing overflow capacity", source: "referral", temperature: "warm" }));

    const draft = dependencies.commands.insertProspect.mock.calls[0]?.[0];
    expect(draft).toMatchObject({ personId, organizationId: null, routeId, routeModuleId: moduleId, status: "researched", temperature: "warm", source: "referral", audit: { action: "prospect.created", entityType: "prospect" } });
    expect(JSON.stringify(draft.audit)).not.toContain("overflow capacity");
    expect(result).toEqual({ prospectId: draft.prospectId, created: true, auditEventId: "audit-1" });
  });

  it("checks that the route and module exist and belong together", async () => {
    await expect(createProspect(createDependencies({ routes: routesFake({ route: null }) }), createActor(), parse())).rejects.toThrow("Route not found");
    await expect(createProspect(createDependencies({ routes: routesFake({ module: { id: moduleId, routeId: otherRouteId, name: "x", archivedAt: null } }) }), createActor(), parse({ routeModuleId: moduleId }))).rejects.toThrow("does not exist in this route");
    await expect(createProspect(createDependencies({ routes: routesFake({ module: null }) }), createActor(), parse({ routeModuleId: moduleId }))).rejects.toMatchObject({ code: "not_found" });
  });

  it("is idempotent: an open prospect for the same target and route is returned instead of a duplicate", async () => {
    const dependencies = createDependencies({ open: { id: "existing-prospect" } });
    const result = await createProspect(dependencies, createActor(), parse());

    expect(result).toEqual({ prospectId: "existing-prospect", created: false, auditEventId: null });
    expect(dependencies.reads.findOpenProspect).toHaveBeenCalledWith({ personId, organizationId: null, routeId, routeModuleId: null });
    expect(dependencies.commands.insertProspect).not.toHaveBeenCalled();
  });

  it("refuses a person marked do-not-contact, an unknown person and an unknown organization", async () => {
    const flagged = createDependencies({ person: { id: personId, fullName: "Marta Chen", doNotContactAt: new Date(), doNotContactReason: "Asked to stop" } });
    await expect(createProspect(flagged, createActor(), parse())).rejects.toThrow('"Marta Chen" is marked do-not-contact (Asked to stop)');
    expect(flagged.commands.insertProspect).not.toHaveBeenCalled();

    await expect(createProspect(createDependencies({ person: null }), createActor(), parse())).rejects.toThrow("Person not found");
    await expect(createProspect(createDependencies({ organization: null }), createActor(), parse({ organizationId }))).rejects.toThrow("Organization not found");
  });

  it("accepts an organization-only prospect", async () => {
    const dependencies = createDependencies();
    await createProspect(dependencies, createActor(), createProspectInputSchema.parse({ organizationId, routeId }));

    expect(dependencies.people.findPerson).not.toHaveBeenCalled();
    expect(dependencies.commands.insertProspect).toHaveBeenCalledWith(expect.objectContaining({ personId: null, organizationId }));
  });
});

describe("updateProspect", () => {
  const current = { id: prospectId, routeId, moduleId, temperature: "cold", source: "referral", whyTargeted: "Secret strategy", currentTrigger: null, nextAction: "Send intro" };
  const dependencies = (routes = routesFake()) => ({ reads: { findProspect: vi.fn().mockResolvedValue(current) }, routes, commands: { updateProspect: vi.fn().mockResolvedValue("audit-1") } });
  const parse = (fields: Record<string, unknown>) => updateProspectInputSchema.parse({ prospectId, ...fields });

  it("writes only what differs and keeps qualification text out of the audit trail", async () => {
    const deps = dependencies();
    await updateProspect(deps, createActor(), parse({ temperature: "hot", whyTargeted: "New secret strategy", nextAction: "Send intro" }));

    expect(deps.commands.updateProspect).toHaveBeenCalledWith(prospectId, { temperature: "hot", whyTargeted: "New secret strategy" }, expect.objectContaining({ action: "prospect.updated", metadata: { fields: ["temperature", "whyTargeted"], before: { temperature: "cold" }, after: { temperature: "hot" } } }));
    expect(JSON.stringify(deps.commands.updateProspect.mock.calls[0]?.[2])).not.toContain("secret strategy");
  });

  it("is a no-op when nothing differs", async () => {
    const deps = dependencies();

    expect(await updateProspect(deps, createActor(), parse({ temperature: "cold", routeId }))).toEqual({ prospectId, changed: false, auditEventId: null });
    expect(deps.commands.updateProspect).not.toHaveBeenCalled();
  });

  it("clears the module when the route changes without naming one, and validates the new pair", async () => {
    const routes = routesFake({ route: { id: otherRouteId, name: "Recruiters", archivedAt: null } });
    const deps = dependencies(routes);
    await updateProspect(deps, createActor(), parse({ routeId: otherRouteId }));

    expect(routes.findModule).not.toHaveBeenCalled();
    expect(deps.commands.updateProspect).toHaveBeenCalledWith(prospectId, { routeId: otherRouteId, routeModuleId: null }, expect.anything());
  });

  it("moves to another module of the same route, and can clear the module with null", async () => {
    const other = id("06");
    const deps = dependencies(routesFake({ module: { id: other, routeId, name: "Security", archivedAt: null } }));
    await updateProspect(deps, createActor(), parse({ routeModuleId: other }));
    expect(deps.commands.updateProspect).toHaveBeenCalledWith(prospectId, { routeId, routeModuleId: other }, expect.anything());

    const cleared = dependencies();
    await updateProspect(cleared, createActor(), parse({ routeModuleId: null }));
    expect(cleared.commands.updateProspect).toHaveBeenCalledWith(prospectId, { routeId, routeModuleId: null }, expect.anything());
  });

  it("refuses a module that does not belong to the target route", async () => {
    const foreign = id("07");
    const deps = dependencies(routesFake({ module: { id: foreign, routeId: otherRouteId, name: "x", archivedAt: null } }));

    await expect(updateProspect(deps, createActor(), parse({ routeModuleId: foreign, temperature: "hot" }))).rejects.toMatchObject({ code: "not_found" });
    expect(deps.commands.updateProspect).not.toHaveBeenCalled();
  });

  it("reports an unknown prospect", async () => {
    const deps = dependencies();
    deps.reads.findProspect.mockResolvedValue(null);

    await expect(updateProspect(deps, createActor(), parse({ temperature: "hot" }))).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("updateProspectStatus", () => {
  const dependencies = (current: Record<string, unknown> = { id: prospectId, status: "contacted", structuralReason: null }) => ({ reads: { findProspect: vi.fn().mockResolvedValue(current) }, commands: { updateStatus: vi.fn().mockResolvedValue("audit-1") } });
  const parse = (fields: Record<string, unknown>) => updateProspectStatusInputSchema.parse({ prospectId, ...fields });

  it("moves to any other status and audits the transition", async () => {
    const deps = dependencies();
    const result = await updateProspectStatus(deps, createActor(), parse({ status: "warm" }));

    expect(deps.commands.updateStatus).toHaveBeenCalledWith(prospectId, { status: "warm", structuralReason: null }, expect.objectContaining({ action: "prospect.status_changed", metadata: { from: "contacted", to: "warm", structuralReason: null } }));
    expect(result).toEqual({ prospectId, status: "warm", previousStatus: "contacted", changed: true, auditEventId: "audit-1" });
  });

  it("requires a structural reason to disqualify, and clears it when leaving that status", async () => {
    // Bypasses the schema on purpose: the service enforces the rule again for any caller that skips validation.
    await expect(updateProspectStatus(dependencies(), createActor(), { prospectId, status: "disqualified" })).rejects.toThrow("needs a structuralReason");

    const disqualify = dependencies();
    await updateProspectStatus(disqualify, createActor(), parse({ status: "disqualified", structuralReason: "residency" }));
    expect(disqualify.commands.updateStatus).toHaveBeenCalledWith(prospectId, { status: "disqualified", structuralReason: "residency" }, expect.anything());

    const reopen = dependencies({ id: prospectId, status: "disqualified", structuralReason: "residency" });
    await updateProspectStatus(reopen, createActor(), parse({ status: "dormant" }));
    expect(reopen.commands.updateStatus).toHaveBeenCalledWith(prospectId, { status: "dormant", structuralReason: null }, expect.anything());
  });

  it("is a no-op when the status and reason are already current, but updates a changed reason", async () => {
    const same = dependencies({ id: prospectId, status: "disqualified", structuralReason: "residency" });
    expect(await updateProspectStatus(same, createActor(), parse({ status: "disqualified", structuralReason: "residency" }))).toMatchObject({ changed: false, auditEventId: null });
    expect(same.commands.updateStatus).not.toHaveBeenCalled();

    const changedReason = dependencies({ id: prospectId, status: "disqualified", structuralReason: "residency" });
    await updateProspectStatus(changedReason, createActor(), parse({ status: "disqualified", structuralReason: "language" }));
    expect(changedReason.commands.updateStatus).toHaveBeenCalled();
  });

  it("reports an unknown prospect", async () => {
    const deps = dependencies();
    deps.reads.findProspect.mockResolvedValue(null);

    await expect(updateProspectStatus(deps, createActor(), parse({ status: "warm" }))).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("addSignal", () => {
  const dependencies = (overrides: { prospect?: unknown; existing?: unknown } = {}) => ({
    reads: { findProspect: vi.fn().mockResolvedValue("prospect" in overrides ? overrides.prospect : { id: prospectId }), findSignal: vi.fn().mockResolvedValue(overrides.existing ?? null) },
    commands: { insertSignal: vi.fn().mockResolvedValue("audit-1") }
  });
  const input = addSignalInputSchema.parse({ prospectId, type: "live_role", summary: "Hiring a fractional CTO", sourceUrl: "https://bluewave.io/jobs/cto", observedAt: "2026-09-01T10:00:00Z" });

  it("records the signal and audits its type without the summary", async () => {
    const deps = dependencies();
    const result = await addSignal(deps, createActor(), input);

    const draft = deps.commands.insertSignal.mock.calls[0]?.[0];
    expect(draft).toMatchObject({ prospectId, type: "live_role", summary: "Hiring a fractional CTO", sourceUrl: "https://bluewave.io/jobs/cto", observedAt: new Date("2026-09-01T10:00:00Z"), expiresAt: null });
    expect(JSON.stringify(draft.audit)).not.toContain("fractional CTO");
    expect(result).toEqual({ signalId: draft.signalId, created: true, auditEventId: "audit-1" });
  });

  it("is idempotent for the same type and summary on the same prospect", async () => {
    const deps = dependencies({ existing: { id: "signal-1" } });

    expect(await addSignal(deps, createActor(), input)).toEqual({ signalId: "signal-1", created: false, auditEventId: null });
    expect(deps.reads.findSignal).toHaveBeenCalledWith(prospectId, "live_role", "Hiring a fractional CTO");
    expect(deps.commands.insertSignal).not.toHaveBeenCalled();
  });

  it("reports an unknown prospect", async () => {
    await expect(addSignal(dependencies({ prospect: null }), createActor(), input)).rejects.toMatchObject({ code: "not_found" });
  });
});
