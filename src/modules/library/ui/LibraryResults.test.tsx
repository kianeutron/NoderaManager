import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultLibraryFilters } from "@/modules/library/domain/document.schema";
import type { DocumentPage } from "@/modules/library/domain/document.types";
import { LibraryResults } from "@/modules/library/ui/LibraryResults";
import { useDocumentPages } from "@/modules/library/ui/use-library-queries";
import { createDocumentSummary } from "@/test/factories/library-documents";
import { renderWithTheme } from "@/test/render-with-theme";

vi.mock("@/modules/library/ui/use-library-queries");

const fetchNextPage = vi.fn();
const refetch = vi.fn();

function mockQuery(state: Record<string, unknown>) {
  // The hook's full result type is huge; the component reads only these fields.
  vi.mocked(useDocumentPages).mockReturnValue({ isPending: false, isError: false, isPlaceholderData: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage, refetch, ...state } as unknown as ReturnType<typeof useDocumentPages>);
}

const pageOf = (ids: string[], overrides: Partial<DocumentPage> = {}): DocumentPage => ({ items: ids.map((id) => createDocumentSummary({ id, title: `Doc ${id}` })), total: 30, nextCursor: null, ...overrides });
const renderResults = (filters = defaultLibraryFilters) => renderWithTheme(<LibraryResults filters={filters} onClearFilters={vi.fn()} onSelect={vi.fn()} selectedId={null} />);

describe("LibraryResults pagination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the total from the first page and a Show more button while another page exists", () => {
    mockQuery({ data: { pages: [pageOf(["a", "b"], { nextCursor: "next" })] }, hasNextPage: true });
    renderResults();

    expect(screen.getByText("30 documents")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it("hides Show more on the last page", () => {
    mockQuery({ data: { pages: [pageOf(["a"], { total: 1 })] } });
    renderResults();

    expect(screen.getByText("1 document")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show more/i })).toBeNull();
  });

  it("disables the button while the next page loads", () => {
    mockQuery({ data: { pages: [pageOf(["a"], { nextCursor: "next" })] }, hasNextPage: true, isFetchingNextPage: true });
    renderResults();

    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
  });

  it("renders a document only once even if two pages both contain it", () => {
    mockQuery({ data: { pages: [pageOf(["a", "b"], { nextCursor: "next" }), pageOf(["b", "c"], { total: null })] } });
    renderResults();

    expect(screen.getAllByText("Doc b")).toHaveLength(1);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("offers to clear filters when nothing matches", () => {
    mockQuery({ data: { pages: [pageOf([], { total: 0 })] } });
    renderResults({ ...defaultLibraryFilters, q: "zzz" });

    expect(screen.getByText("No documents match")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("offers a retry when the request fails", () => {
    mockQuery({ isError: true });
    renderResults();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
