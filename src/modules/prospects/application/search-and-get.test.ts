import { describe, expect, it, vi } from "vitest";
import { getProspect } from "@/modules/prospects/application/get-prospect.service";
import { searchProspects } from "@/modules/prospects/application/search-prospects.service";
import { prospectPagination, prospectSearchQuerySchema } from "@/modules/prospects/domain/prospect.schema";

const rowId = (index: number) => `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d${String(index).padStart(2, "0")}`;
const updatedAt = new Date("2026-09-20T12:00:00Z");

function createRow(index: number) {
  return { id: rowId(index), status: "warm" as const, temperature: null, personId: "p1", personName: "Marta Chen", organizationId: null, organizationName: null, routeId: "r1", routeName: "Referral partners", moduleId: null, moduleName: null, nextAction: "Send intro", lastContactedAt: null, updatedAt, sortKey: `key-${index}` };
}

describe("searchProspects", () => {
  const repository = (rowCount: number, total = rowCount) => ({ searchProspects: vi.fn().mockResolvedValue(Array.from({ length: rowCount }, (_, index) => createRow(index))), countProspects: vi.fn().mockResolvedValue(total) });

  it("maps rows to compact summaries, counts once, and passes filters through", async () => {
    const deps = repository(3, 9);
    const page = await searchProspects(deps, prospectSearchQuerySchema.parse({ limit: 2, statuses: ["warm"], routeId: rowId(50) }));

    expect(page.items[0]).toEqual({ id: rowId(0), status: "warm", temperature: null, person: { id: "p1", fullName: "Marta Chen" }, organization: null, route: { id: "r1", name: "Referral partners" }, module: null, nextAction: "Send intro", lastContactedAt: null, updatedAt: "2026-09-20T12:00:00.000Z" });
    expect(page).toMatchObject({ total: 9, nextCursor: expect.any(String) });
    expect(page.items).toHaveLength(2);
    expect(deps.searchProspects).toHaveBeenCalledWith(expect.objectContaining({ statuses: ["warm"], routeId: rowId(50), limit: 2 }));
    expect(deps.countProspects).toHaveBeenCalledWith({ statuses: ["warm"], routeId: rowId(50) });
  });

  it("continues from a cursor without counting, and ends on the last page", async () => {
    const deps = repository(1);
    const cursor = prospectPagination.encode({ sort: "updated", key: "2026-09-20 10:00:00+00", id: rowId(5) });
    const page = await searchProspects(deps, prospectSearchQuerySchema.parse({ cursor }));

    expect(page).toMatchObject({ total: null, nextCursor: null });
    expect(deps.countProspects).not.toHaveBeenCalled();
  });
});

describe("getProspect", () => {
  const found = { ...createRow(0), source: "referral" as const, whyTargeted: "Runs a UX studio", currentTrigger: null, structuralReason: null, statusChangedAt: updatedAt };

  it("returns the prospect with its signals and recent notes", async () => {
    const reads = { findProspect: vi.fn().mockResolvedValue(found), listSignals: vi.fn().mockResolvedValue([{ id: "s1", type: "live_role" as const, summary: "Hiring", sourceUrl: null, observedAt: updatedAt, expiresAt: null }]) };
    const notes = { listNotes: vi.fn().mockResolvedValue([{ id: "n1", body: "Met at the conference", createdAt: updatedAt }]) };
    const detail = await getProspect({ reads, notes }, rowId(0));

    expect(detail).toMatchObject({ id: rowId(0), source: "referral", whyTargeted: "Runs a UX studio", statusChangedAt: "2026-09-20T12:00:00.000Z", signals: [{ id: "s1", observedAt: "2026-09-20T12:00:00.000Z", expiresAt: null }], recentNotes: [{ id: "n1", createdAt: "2026-09-20T12:00:00.000Z" }] });
    expect(notes.listNotes).toHaveBeenCalledWith({ targetType: "prospect", targetId: rowId(0) }, 10);
  });

  it("returns null for an unknown prospect without reading anything else", async () => {
    const reads = { findProspect: vi.fn().mockResolvedValue(null), listSignals: vi.fn() };
    const notes = { listNotes: vi.fn() };

    expect(await getProspect({ reads, notes }, rowId(0))).toBeNull();
    expect(reads.listSignals).not.toHaveBeenCalled();
  });
});
