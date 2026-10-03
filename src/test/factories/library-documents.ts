import type { DocumentDetail, DocumentFileInfo, DocumentSummary } from "@/modules/library/domain/document.types";

export const sampleDocumentId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

export function createDocumentFile(overrides: Partial<DocumentFileInfo> = {}): DocumentFileInfo {
  return { originalFilename: "bluewave-proposal.pdf", mimeType: "application/pdf", sizeBytes: 1_258_291, versionNumber: 2, extractionStatus: "ready", ...overrides };
}

export function createDocumentSummary(overrides: Partial<DocumentSummary> = {}): DocumentSummary {
  return { id: sampleDocumentId, title: "Bluewave proposal", category: "proposal", tags: ["Q3", "Agency"], file: createDocumentFile(), updatedAt: "2026-09-20T12:00:00.000Z", ...overrides };
}

export function createDocumentDetail(overrides: Partial<DocumentDetail> = {}): DocumentDetail {
  return {
    ...createDocumentSummary(),
    description: "Fixed-scope delivery plan for the Q3 engagement.",
    folderPath: [{ id: "f1", name: "Sales" }, { id: "f2", name: "Proposals" }],
    versions: [
      { id: "v2", versionNumber: 2, originalFilename: "bluewave-proposal.pdf", mimeType: "application/pdf", sizeBytes: 1_258_291, changeNote: "Added pricing", createdAt: "2026-09-20T12:00:00.000Z", isCurrent: true },
      { id: "v1", versionNumber: 1, originalFilename: "bluewave-proposal.pdf", mimeType: "application/pdf", sizeBytes: 1_100_000, changeNote: null, createdAt: "2026-09-10T12:00:00.000Z", isCurrent: false }
    ],
    links: [{ id: "l1", relation: "sent", targetType: "person", targetId: "p1", label: "Marta Chen" }],
    ...overrides
  };
}
