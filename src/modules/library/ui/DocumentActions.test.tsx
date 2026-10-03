import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocumentActions } from "@/modules/library/ui/DocumentActions";
import { createDocumentDetail, createDocumentFile, sampleDocumentId } from "@/test/factories/library-documents";
import { renderWithTheme } from "@/test/render-with-theme";

describe("DocumentActions", () => {
  it("opens viewable files in a new tab through the authorized endpoint", () => {
    renderWithTheme(<DocumentActions document={createDocumentDetail()} />);

    const open = screen.getByRole("link", { name: "Open document" });
    expect(open).toHaveAttribute("href", `/api/library/documents/${sampleDocumentId}/file?disposition=inline`);
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute("href", `/api/library/documents/${sampleDocumentId}/file?disposition=attachment`);
  });

  it("offers only a download for types browsers cannot display", () => {
    const file = createDocumentFile({ mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", originalFilename: "contract.docx" });
    renderWithTheme(<DocumentActions document={createDocumentDetail({ file })} />);

    expect(screen.queryByRole("link", { name: "Open document" })).toBeNull();
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute("href", expect.stringContaining("disposition=attachment"));
  });

  it("disables actions when no file has been uploaded", () => {
    renderWithTheme(<DocumentActions document={createDocumentDetail({ file: null })} />);

    expect(screen.getByRole("button", { name: "No file uploaded yet" })).toBeDisabled();
  });
});
