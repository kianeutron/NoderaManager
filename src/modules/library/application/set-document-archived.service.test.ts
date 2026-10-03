import { describe, expect, it, vi } from "vitest";
import { archiveDocument, restoreDocument } from "@/modules/library/application/set-document-archived.service";
import { createActor } from "@/test/factories/actors";

const documentId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

function createDependencies(state: Record<string, unknown> | null, folder: unknown = null) {
  return {
    documents: { findDocumentState: vi.fn().mockResolvedValue(state), setArchived: vi.fn().mockResolvedValue("audit-1") },
    folders: { findFolder: vi.fn().mockResolvedValue(folder) }
  };
}

const active = { id: documentId, title: "Deck", archivedAt: null, folderId: null };
const archived = { ...active, archivedAt: new Date("2026-09-01") };

describe("archive and restore", () => {
  it("archives an active document and audits it", async () => {
    const dependencies = createDependencies(active);
    const result = await archiveDocument(dependencies, createActor(), { documentId });

    expect(dependencies.documents.setArchived).toHaveBeenCalledWith(documentId, { archivedAt: expect.any(Date) }, expect.objectContaining({ action: "document.archived" }));
    expect(result).toEqual({ documentId, archived: true, changed: true, auditEventId: "audit-1" });
  });

  it("restores an archived document", async () => {
    const dependencies = createDependencies(archived);
    const result = await restoreDocument(dependencies, createActor(), { documentId });

    expect(dependencies.documents.setArchived).toHaveBeenCalledWith(documentId, { archivedAt: null }, expect.objectContaining({ action: "document.restored" }));
    expect(result.archived).toBe(false);
  });

  it("is idempotent in both directions", async () => {
    const alreadyArchived = createDependencies(archived);
    expect(await archiveDocument(alreadyArchived, createActor(), { documentId })).toEqual({ documentId, archived: true, changed: false, auditEventId: null });
    expect(alreadyArchived.documents.setArchived).not.toHaveBeenCalled();

    const alreadyActive = createDependencies(active);
    expect(await restoreDocument(alreadyActive, createActor(), { documentId })).toEqual({ documentId, archived: false, changed: false, auditEventId: null });
  });

  it("returns a document to Unfiled if its folder was archived while it was hidden", async () => {
    const dependencies = createDependencies({ ...archived, folderId: "folder-1" }, { id: "folder-1", archivedAt: new Date() });
    await restoreDocument(dependencies, createActor(), { documentId });

    expect(dependencies.documents.setArchived).toHaveBeenCalledWith(documentId, { archivedAt: null, folderId: null }, expect.objectContaining({ metadata: { unfiled: true } }));
  });

  it("keeps the folder when it is still active", async () => {
    const dependencies = createDependencies({ ...archived, folderId: "folder-1" }, { id: "folder-1", archivedAt: null });
    await restoreDocument(dependencies, createActor(), { documentId });

    expect(dependencies.documents.setArchived).toHaveBeenCalledWith(documentId, { archivedAt: null }, expect.anything());
  });

  it("reports an unknown document", async () => {
    await expect(archiveDocument(createDependencies(null), createActor(), { documentId })).rejects.toMatchObject({ code: "not_found" });
  });
});
