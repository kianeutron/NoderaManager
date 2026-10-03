import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentCard } from "@/modules/library/ui/DocumentCard";
import { createDocumentSummary } from "@/test/factories/library-documents";
import { renderWithTheme } from "@/test/render-with-theme";

describe("DocumentCard", () => {
  it("shows the title with category and size, and selects the document on click", () => {
    const onSelect = vi.fn();
    const document = createDocumentSummary();
    renderWithTheme(<DocumentCard document={document} onSelect={onSelect} selected={false} />);

    expect(screen.getByText("Bluewave proposal")).toBeInTheDocument();
    expect(screen.getByText("Proposal · 1.2 MB")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(document.id);
  });

  it("marks the selected card for assistive technology", () => {
    renderWithTheme(<DocumentCard document={createDocumentSummary()} onSelect={vi.fn()} selected />);

    expect(screen.getByRole("button")).toHaveAttribute("aria-current", "true");
  });

  it("omits the size when no file has been uploaded yet", () => {
    renderWithTheme(<DocumentCard document={createDocumentSummary({ file: null })} onSelect={vi.fn()} selected={false} />);

    expect(screen.getByText("Proposal")).toBeInTheDocument();
  });
});
