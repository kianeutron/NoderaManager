import { describe, expect, it, vi } from "vitest";
import { openDocumentFile } from "@/modules/library/application/open-document-file.service";

const pdfFile = { blobKey: "documents/abc", originalFilename: "deck.pdf", mimeType: "application/pdf" };
const stream = new ReadableStream<Uint8Array>();

function createDependencies(file: typeof pdfFile | null, blob: ReadableStream<Uint8Array> | null) {
  return { repository: { findCurrentFile: vi.fn().mockResolvedValue(file) }, blobStore: { open: vi.fn().mockResolvedValue(blob) } };
}

describe("openDocumentFile", () => {
  it("opens the current version's private bytes with a safe disposition", async () => {
    const dependencies = createDependencies(pdfFile, stream);
    const opened = await openDocumentFile(dependencies, "d1", "inline");

    expect(dependencies.blobStore.open).toHaveBeenCalledWith("documents/abc");
    expect(opened).toEqual({ stream, contentType: "application/pdf", disposition: "inline", filename: "deck.pdf" });
  });

  it("downgrades inline to attachment for types a browser must not render", async () => {
    const opened = await openDocumentFile(createDependencies({ ...pdfFile, mimeType: "text/csv" }, stream), "d1", "inline");

    expect(opened?.disposition).toBe("attachment");
  });

  it("returns null when the document has no downloadable file", async () => {
    const dependencies = createDependencies(null, stream);

    expect(await openDocumentFile(dependencies, "d1", "inline")).toBeNull();
    expect(dependencies.blobStore.open).not.toHaveBeenCalled();
  });

  it("returns null when the stored bytes are missing", async () => {
    expect(await openDocumentFile(createDependencies(pdfFile, null), "d1", "inline")).toBeNull();
  });
});
