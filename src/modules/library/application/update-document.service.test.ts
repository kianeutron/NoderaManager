import { describe, expect, it, vi } from "vitest";
import { updateDocument } from "@/modules/library/application/update-document.service";
import { updateDocumentInputSchema } from "@/modules/library/domain/document-commands.schema";
import { createActor } from "@/test/factories/actors";

const documentId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const folderId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d01";
const current = { id: documentId, title: "Old title", description: "Old description", category: "proposal", folderId: null, archivedAt: null };

function createDependencies(folder: unknown = { id: folderId, archivedAt: null }) {
  return {
    documents: { findDocumentState: vi.fn().mockResolvedValue(current), updateDocument: vi.fn().mockResolvedValue("audit-1") },
    folders: { findFolder: vi.fn().mockResolvedValue(folder) }
  };
}

const parse = (fields: Record<string, unknown>) => updateDocumentInputSchema.parse({ documentId, ...fields });

describe("updateDocument", () => {
  it("writes only the fields that differ and audits which ones changed", async () => {
    const dependencies = createDependencies();
    const result = await updateDocument(dependencies, createActor(), parse({ title: "New title", category: "proposal", description: "Old description" }));

    expect(dependencies.documents.updateDocument).toHaveBeenCalledWith(documentId, { title: "New title" }, expect.objectContaining({ action: "document.updated", metadata: expect.objectContaining({ fields: ["title"] }) }));
    expect(result).toEqual({ documentId, changed: true, auditEventId: "audit-1" });
  });

  it("is a silent no-op when nothing differs", async () => {
    const dependencies = createDependencies();
    const result = await updateDocument(dependencies, createActor(), parse({ title: "Old title" }));

    expect(result).toEqual({ documentId, changed: false, auditEventId: null });
    expect(dependencies.documents.updateDocument).not.toHaveBeenCalled();
  });

  it("keeps the description body out of the audit trail", async () => {
    const dependencies = createDependencies();
    await updateDocument(dependencies, createActor(), parse({ description: "A private strategy note" }));

    expect(JSON.stringify(dependencies.documents.updateDocument.mock.calls[0]?.[2])).not.toContain("private strategy");
  });

  it("clears the description and unfiles with null", async () => {
    const dependencies = createDependencies();
    dependencies.documents.findDocumentState.mockResolvedValue({ ...current, folderId });
    await updateDocument(dependencies, createActor(), parse({ description: null, folderId: null }));

    expect(dependencies.documents.updateDocument).toHaveBeenCalledWith(documentId, { description: null, folderId: null }, expect.anything());
  });

  it("refuses to move a document into a missing or archived folder", async () => {
    await expect(updateDocument(createDependencies(null), createActor(), parse({ folderId }))).rejects.toMatchObject({ code: "not_found" });
    await expect(updateDocument(createDependencies({ id: folderId, archivedAt: new Date() }), createActor(), parse({ folderId }))).rejects.toMatchObject({ code: "not_found" });
  });
});
