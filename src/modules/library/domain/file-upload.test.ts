import { describe, expect, it } from "vitest";
import { buildUploadedVersionDraft, maxUploadBytes, sanitizeOriginalFilename } from "@/modules/library/domain/file-upload";

describe("file upload validation", () => {
  it("accepts a valid PDF signature and generates a server-owned key", () => {
    const draft = buildUploadedVersionDraft({ documentId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90", filename: "brief.pdf", mimeType: "application/pdf", bytes: new TextEncoder().encode("%PDF-1.7"), createdBy: "owner" });
    expect(draft.blobKey).toMatch(/^documents\/0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90\//);
    expect(draft.extractionStatus).toBe("skipped");
  });

  it("rejects unsupported extensions and oversized files", () => {
    expect(() => buildUploadedVersionDraft({ documentId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90", filename: "run.exe", mimeType: "application/octet-stream", bytes: new Uint8Array([1]), createdBy: "owner" })).toThrow("not supported");
    expect(() => buildUploadedVersionDraft({ documentId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90", filename: "notes.txt", mimeType: "text/plain", bytes: new Uint8Array(maxUploadBytes + 1), createdBy: "owner" })).toThrow("25 MB");
  });

  it("removes path separators from stored display names", () => {
    expect(sanitizeOriginalFilename("folder\\report.txt")).toBe("folderreport.txt");
  });
});
