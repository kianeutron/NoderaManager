import { describe, expect, it, vi } from "vitest";
import { searchFollowUps } from "@/modules/followups/application/search-followups.service";
import { followUpPagination, followUpSearchQuerySchema } from "@/modules/followups/domain/followup.schema";

const row = (index: number) => ({
  id: `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d${String(index).padStart(2, "0")}`, status: "active", reason: "Ask", dueAt: new Date("2026-11-01T00:00:00Z"), notBeforeAt: null, suggestedChannel: null,
  completedAt: null, dismissedReason: null, createdAt: new Date("2026-09-01T00:00:00Z"), prospectId: "p1", prospectStatus: "contacted", routeName: "Agencies",
  personId: "person-1", personName: "Marta Chen", organizationId: null, organizationName: null, sortKey: "2026-11-01 00:00:00+00"
});

describe("searchFollowUps", () => {
  it("counts only on the first page and maps rows to views without the sort key", async () => {
    const repository = { searchFollowUps: vi.fn().mockResolvedValue([row(1)]), countFollowUps: vi.fn().mockResolvedValue(1) };
    const page = await searchFollowUps(repository, followUpSearchQuerySchema.parse({ due: "overdue" }));

    expect(repository.countFollowUps).toHaveBeenCalledWith({ status: "active", due: "overdue" });
    expect(page.items[0]).toMatchObject({ dueAt: "2026-11-01T00:00:00.000Z", prospect: { id: "p1", status: "contacted", routeName: "Agencies" }, person: { id: "person-1", fullName: "Marta Chen" }, organization: null });
    expect(page.items[0]).not.toHaveProperty("sortKey");
  });

  it("pages with a cursor that carries the sort and the last id, and does not count again", async () => {
    const repository = { searchFollowUps: vi.fn().mockResolvedValue([row(1), row(2), row(3)]), countFollowUps: vi.fn().mockResolvedValue(9) };
    const first = await searchFollowUps(repository, followUpSearchQuerySchema.parse({ limit: "2" }));
    expect(first.items).toHaveLength(2);
    expect(followUpPagination.decode(first.nextCursor as string)).toMatchObject({ sort: "due", id: row(2).id });

    repository.countFollowUps.mockClear();
    const second = await searchFollowUps(repository, followUpSearchQuerySchema.parse({ limit: "2", cursor: first.nextCursor }));
    expect(repository.countFollowUps).not.toHaveBeenCalled();
    expect(second.total).toBeNull();
  });
});
