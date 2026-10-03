import { describe, expect, it, vi } from "vitest";
import { searchOutreach } from "@/modules/outreach/application/search-outreach.service";
import { outreachPagination, outreachSearchQuerySchema } from "@/modules/outreach/domain/outreach.schema";

const row = (index: number) => ({
  id: `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d${String(index).padStart(2, "0")}`, channel: "email", subject: null, preview: "Hi", sentAt: new Date("2026-09-01T10:00:00Z"), deliveryStatus: "sent", replyStatus: "none",
  prospectId: "p1", personId: "person-1", personName: "Marta Chen", organizationId: null, organizationName: null, sortKey: "2026-09-01 10:00:00+00"
});

describe("searchOutreach", () => {
  it("counts only on the first page and maps rows to views", async () => {
    const repository = { searchMessages: vi.fn().mockResolvedValue([row(1)]), countMessages: vi.fn().mockResolvedValue(1) };
    const page = await searchOutreach(repository, outreachSearchQuerySchema.parse({ q: "marta" }));

    expect(repository.countMessages).toHaveBeenCalledWith({ q: "marta" });
    expect(page).toEqual({ total: 1, nextCursor: null, items: [expect.objectContaining({ sentAt: "2026-09-01T10:00:00.000Z", person: { id: "person-1", fullName: "Marta Chen" }, organization: null })] });
    expect(page.items[0]).not.toHaveProperty("sortKey");
  });

  it("fetches one extra row to know there is another page, and continues from a cursor without counting again", async () => {
    const repository = { searchMessages: vi.fn().mockResolvedValue([row(1), row(2), row(3)]), countMessages: vi.fn().mockResolvedValue(9) };
    const first = await searchOutreach(repository, outreachSearchQuerySchema.parse({ limit: "2" }));

    expect(repository.searchMessages).toHaveBeenCalledWith(expect.objectContaining({ limit: 2 }));
    expect(first.items).toHaveLength(2);
    expect(outreachPagination.decode(first.nextCursor as string)).toMatchObject({ sort: "sent", id: row(2).id });

    repository.countMessages.mockClear();
    const second = await searchOutreach(repository, outreachSearchQuerySchema.parse({ limit: "2", cursor: first.nextCursor }));
    expect(repository.countMessages).not.toHaveBeenCalled();
    expect(second.total).toBeNull();
  });
});
