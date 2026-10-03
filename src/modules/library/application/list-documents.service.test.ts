import { describe, expect, it, vi } from "vitest";
import { listDocuments } from "@/modules/library/application/list-documents.service";
import { documentListQuerySchema, documentPagination } from "@/modules/library/domain/document.schema";

const rowId = (index: number) => `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d${String(index).padStart(2, "0")}`;

function createRow(index: number) {
  return { id: rowId(index), title: `Doc ${index}`, category: "report" as const, updatedAt: new Date("2026-09-20T12:00:00Z"), sortKey: `key-${index}`, versionNumber: 1, mimeType: "application/pdf", sizeBytes: 10, originalFilename: `${index}.pdf`, extractionStatus: "ready" as const };
}

function createRepository(rowCount: number, total = rowCount) {
  return {
    listDocuments: vi.fn().mockResolvedValue(Array.from({ length: rowCount }, (_, index) => createRow(index))),
    countDocuments: vi.fn().mockResolvedValue(total),
    listTagNames: vi.fn().mockResolvedValue(new Map([[rowId(0), ["Q3", "Pitch"]]]))
  };
}

describe("listDocuments", () => {
  it("returns the requested page, its tags and the total on the first page", async () => {
    const repository = createRepository(3, 9);
    const page = await listDocuments(repository, documentListQuerySchema.parse({ limit: 2 }));

    expect(page.items.map((item) => [item.id, item.tags])).toEqual([[rowId(0), ["Q3", "Pitch"]], [rowId(1), []]]);
    expect(page.total).toBe(9);
    expect(repository.listTagNames).toHaveBeenCalledWith([rowId(0), rowId(1)]);
  });

  it("asks the repository for one extra row to detect another page", async () => {
    const repository = createRepository(3);
    await listDocuments(repository, documentListQuerySchema.parse({ limit: 2 }));

    expect(repository.listDocuments).toHaveBeenCalledWith(expect.objectContaining({ limit: 2 }));
  });

  it("points the next cursor at the last returned row, not at the extra one", async () => {
    const page = await listDocuments(createRepository(3), documentListQuerySchema.parse({ limit: 2, sort: "title" }));

    expect(page.nextCursor && documentPagination.decode(page.nextCursor)).toEqual({ sort: "title", key: "key-1", id: rowId(1) });
  });

  it("ends pagination when the extra row is absent", async () => {
    const page = await listDocuments(createRepository(2), documentListQuerySchema.parse({ limit: 2 }));

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("skips counting on later pages and hands the decoded cursor to the repository", async () => {
    const repository = createRepository(1);
    const cursor = documentPagination.encode({ sort: "updated", key: "2026-09-20 10:00:00.123456+00", id: rowId(5) });
    const page = await listDocuments(repository, documentListQuerySchema.parse({ cursor }));

    expect(page.total).toBeNull();
    expect(repository.countDocuments).not.toHaveBeenCalled();
    expect(repository.listDocuments).toHaveBeenCalledWith(expect.objectContaining({ cursor: { sort: "updated", key: "2026-09-20 10:00:00.123456+00", id: rowId(5) } }));
  });

  it("handles an empty library", async () => {
    const page = await listDocuments(createRepository(0), documentListQuerySchema.parse({}));

    expect(page).toEqual({ items: [], total: 0, nextCursor: null });
  });

  it("fails loudly if an unvalidated cursor ever reaches the service", async () => {
    const query = { ...documentListQuerySchema.parse({}), cursor: "garbage" };

    await expect(listDocuments(createRepository(1), query)).rejects.toThrow("boundary validation");
  });
});
