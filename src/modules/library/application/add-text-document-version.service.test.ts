import { describe, expect, it, vi } from "vitest";
import { addTextDocumentVersion } from "@/modules/library/application/add-text-document-version.service";
import { addTextDocumentVersionInputSchema } from "@/modules/library/domain/document-commands.schema";
import { sha256Hex } from "@/modules/library/domain/text-content";
import { createActor } from "@/test/factories/actors";

const documentId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

function createState(overrides: Record<string, unknown> = {}) {
  return { id: documentId, title: "Q3 research", archivedAt: null, currentVersionId: "ver-2", currentVersionNumber: 2, currentMimeType: "text/markdown", currentFilename: "q3-research.md", currentChecksum: "old-checksum", ...overrides };
}

function createDependencies(state: unknown = createState()) {
  return {
    documents: { findDocumentState: vi.fn().mockResolvedValue(state), nextVersionNumber: vi.fn().mockResolvedValue(3), insertVersion: vi.fn().mockResolvedValue("audit-1") },
    blobStore: { save: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) },
    resolveOwnerUserId: vi.fn().mockResolvedValue("owner-user-id")
  };
}

const input = addTextDocumentVersionInputSchema.parse({ documentId, content: "new content", changeNote: "Added pricing" });

describe("addTextDocumentVersion", () => {
  it("stores the next version under the same filename and records the change note", async () => {
    const dependencies = createDependencies();
    const result = await addTextDocumentVersion(dependencies, createActor(), input);

    const draft = dependencies.documents.insertVersion.mock.calls[0]?.[0];
    expect(draft).toMatchObject({ documentId, versionNumber: 3, changeNote: "Added pricing", version: { originalFilename: "q3-research.md", mimeType: "text/markdown", extractedText: "new content" } });
    expect(draft.audit).toMatchObject({ action: "document.version_added", entityId: documentId });
    expect(result).toMatchObject({ documentId, versionNumber: 3, created: true, auditEventId: "audit-1" });
  });

  it("does not store identical content twice", async () => {
    const dependencies = createDependencies(createState({ currentChecksum: await sha256Hex("new content") }));
    const result = await addTextDocumentVersion(dependencies, createActor(), input);

    expect(result).toEqual({ documentId, versionId: "ver-2", versionNumber: 2, created: false, auditEventId: null });
    expect(dependencies.blobStore.save).not.toHaveBeenCalled();
  });

  it("refuses documents whose current file is not text", async () => {
    const dependencies = createDependencies(createState({ currentMimeType: "application/pdf" }));

    await expect(addTextDocumentVersion(dependencies, createActor(), input)).rejects.toMatchObject({ code: "unsupported" });
    expect(dependencies.blobStore.save).not.toHaveBeenCalled();
  });

  it("refuses missing and archived documents", async () => {
    await expect(addTextDocumentVersion(createDependencies(null), createActor(), input)).rejects.toMatchObject({ code: "not_found" });
    await expect(addTextDocumentVersion(createDependencies(createState({ archivedAt: new Date() })), createActor(), input)).rejects.toMatchObject({ code: "not_found" });
  });

  it("cleans up the stored bytes when the commit fails", async () => {
    const dependencies = createDependencies();
    dependencies.documents.insertVersion.mockRejectedValue(new Error("commit failed"));

    await expect(addTextDocumentVersion(dependencies, createActor(), input)).rejects.toThrow("commit failed");
    expect(dependencies.blobStore.remove).toHaveBeenCalledOnce();
  });
});
