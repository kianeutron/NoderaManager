import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocumentPreview } from "@/modules/library/ui/DocumentPreview";
import { createDocumentDetail } from "@/test/factories/library-documents";
import { renderWithTheme } from "@/test/render-with-theme";

describe("DocumentPreview", () => {
  it("presents the document's key facts", () => {
    renderWithTheme(<DocumentPreview document={createDocumentDetail()} />);

    expect(screen.getByRole("heading", { level: 2, name: "Bluewave proposal" })).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("1.2 MB")).toBeInTheDocument();
    expect(screen.getByText("Fixed-scope delivery plan for the Q3 engagement.")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Tags" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Sales / Proposals")).toBeInTheDocument();
    expect(screen.getByText("Searchable")).toBeInTheDocument();
  });

  it("lists what the document is linked to and its version history", () => {
    renderWithTheme(<DocumentPreview document={createDocumentDetail()} />);

    expect(screen.getByText("Marta Chen")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("v2 · Current")).toBeInTheDocument();
    expect(screen.getByText("Added pricing")).toBeInTheDocument();
  });

  it("renders untrusted text as text, never as markup", () => {
    const description = "<img src=x onerror=alert(1)> **bold**";
    const { container } = renderWithTheme(<DocumentPreview document={createDocumentDetail({ description })} />);

    expect(screen.getByText(description)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("degrades gracefully for a bare document", () => {
    renderWithTheme(<DocumentPreview document={createDocumentDetail({ description: null, tags: [], links: [], versions: [], folderPath: [], file: null })} />);

    expect(screen.getByText("No description added yet.")).toBeInTheDocument();
    expect(screen.getByText("Unfiled")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Tags" })).toBeNull();
    expect(screen.queryByText("Linked to")).toBeNull();
  });
});
