import { describe, expect, it, vi } from "vitest";
import { searchPeople } from "@/modules/people/application/search-people.service";
import { personPagination, personSearchQuerySchema } from "@/modules/people/domain/person.schema";

const rowId = (index: number) => `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d${String(index).padStart(2, "0")}`;

function createRow(index: number) {
  return { id: rowId(index), fullName: `Person ${index}`, role: null, persona: null, organizationId: index === 0 ? "org-1" : null, organizationName: index === 0 ? "Acme" : null, countryCode: "DE", city: null, lastContactedAt: null, doNotContactAt: index === 1 ? new Date("2026-09-01T10:00:00Z") : null, updatedAt: new Date("2026-09-20T12:00:00Z"), sortKey: `key-${index}` };
}

function createRepository(rowCount: number, total = rowCount) {
  return { searchPeople: vi.fn().mockResolvedValue(Array.from({ length: rowCount }, (_, index) => createRow(index))), countPeople: vi.fn().mockResolvedValue(total) };
}

describe("searchPeople", () => {
  it("maps rows to compact summaries and counts on the first page", async () => {
    const repository = createRepository(3, 9);
    const page = await searchPeople(repository, personSearchQuerySchema.parse({ limit: 2 }));

    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toMatchObject({ id: rowId(0), fullName: "Person 0", organization: { id: "org-1", name: "Acme" }, doNotContact: false, updatedAt: "2026-09-20T12:00:00.000Z" });
    expect(page.items[1]).toMatchObject({ organization: null, doNotContact: true });
    expect(page.total).toBe(9);
    expect(repository.searchPeople).toHaveBeenCalledWith(expect.objectContaining({ limit: 2, sort: "updated" }));
  });

  it("points the next cursor at the last returned row, not at the extra one", async () => {
    const page = await searchPeople(createRepository(3), personSearchQuerySchema.parse({ limit: 2, sort: "name" }));

    expect(page.nextCursor && personPagination.decode(page.nextCursor)).toEqual({ sort: "name", key: "key-1", id: rowId(1) });
  });

  it("ends pagination on the last page and skips counting on later pages", async () => {
    const repository = createRepository(1);
    const cursor = personPagination.encode({ sort: "updated", key: "2026-09-20 10:00:00+00", id: rowId(5) });
    const page = await searchPeople(repository, personSearchQuerySchema.parse({ cursor }));

    expect(page).toMatchObject({ nextCursor: null, total: null });
    expect(repository.countPeople).not.toHaveBeenCalled();
    expect(repository.searchPeople).toHaveBeenCalledWith(expect.objectContaining({ cursor: { sort: "updated", key: "2026-09-20 10:00:00+00", id: rowId(5) } }));
  });

  it("handles an empty result", async () => {
    expect(await searchPeople(createRepository(0), personSearchQuerySchema.parse({}))).toEqual({ items: [], total: 0, nextCursor: null });
  });
});
