import { describe, expect, it, vi } from "vitest";
import { linkDocument, unlinkDocument } from "@/modules/library/application/document-links.service";
import { linkDocumentInputSchema } from "@/modules/library/domain/document-commands.schema";
import { createActor } from "@/test/factories/actors";

const documentId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const targetId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d02";
const versionId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d03";

function createDependencies(overrides: { document?: unknown; targetExists?: boolean; versionOk?: boolean; existing?: unknown } = {}) {
  return {
    documents: { findDocumentState: vi.fn().mockResolvedValue("document" in overrides ? overrides.document : { id: documentId, title: "Deck", archivedAt: null }) },
    links: {
      targetExists: vi.fn().mockResolvedValue(overrides.targetExists ?? true),
      versionBelongsToDocument: vi.fn().mockResolvedValue(overrides.versionOk ?? true),
      findLink: vi.fn().mockResolvedValue(overrides.existing ?? null),
      findLinkById: vi.fn().mockResolvedValue({ id: "link-1", documentId }),
      insertLink: vi.fn().mockResolvedValue("audit-1"),
      deleteLink: vi.fn().mockResolvedValue("audit-2")
    },
    resolveOwnerUserId: vi.fn().mockResolvedValue("owner-user-id")
  };
}

const input = linkDocumentInputSchema.parse({ documentId, targetType: "person", targetId, relation: "sent", versionId });

describe("linkDocument", () => {
  it("creates the link with its audit event", async () => {
    const dependencies = createDependencies();
    const result = await linkDocument(dependencies, createActor(), input);

    expect(dependencies.links.insertLink).toHaveBeenCalledWith(expect.objectContaining({ documentId, targetType: "person", targetId, versionId, relation: "sent", createdBy: "owner-user-id", audit: expect.objectContaining({ action: "document.linked", entityId: documentId }) }));
    expect(result).toEqual({ linkId: expect.any(String), created: true, auditEventId: "audit-1" });
  });

  it("returns an identical existing link unchanged", async () => {
    const dependencies = createDependencies({ existing: { id: "link-9" } });
    const result = await linkDocument(dependencies, createActor(), input);

    expect(result).toEqual({ linkId: "link-9", created: false, auditEventId: null });
    expect(dependencies.links.insertLink).not.toHaveBeenCalled();
  });

  it("names the missing kind of target", async () => {
    await expect(linkDocument(createDependencies({ targetExists: false }), createActor(), input)).rejects.toThrow("person to link was not found");
  });

  it("refuses a version that belongs to a different document", async () => {
    await expect(linkDocument(createDependencies({ versionOk: false }), createActor(), input)).rejects.toMatchObject({ code: "not_found" });
  });

  it("refuses archived and unknown documents", async () => {
    await expect(linkDocument(createDependencies({ document: null }), createActor(), input)).rejects.toMatchObject({ code: "not_found" });
    await expect(linkDocument(createDependencies({ document: { id: documentId, archivedAt: new Date() } }), createActor(), input)).rejects.toMatchObject({ code: "not_found" });
  });

  it("does not check a version when none is pinned", async () => {
    const dependencies = createDependencies();
    await linkDocument(dependencies, createActor(), linkDocumentInputSchema.parse({ documentId, targetType: "route", targetId }));

    expect(dependencies.links.versionBelongsToDocument).not.toHaveBeenCalled();
  });
});

describe("unlinkDocument", () => {
  it("removes the link and audits it against the document", async () => {
    const dependencies = createDependencies();
    const result = await unlinkDocument(dependencies, createActor(), { linkId: "link-1" });

    expect(dependencies.links.deleteLink).toHaveBeenCalledWith("link-1", expect.objectContaining({ action: "document.unlinked", entityId: documentId }));
    expect(result).toEqual({ linkId: "link-1", auditEventId: "audit-2" });
  });

  it("reports an unknown link", async () => {
    const dependencies = createDependencies();
    dependencies.links.findLinkById.mockResolvedValue(null);

    await expect(unlinkDocument(dependencies, createActor(), { linkId: "nope" })).rejects.toMatchObject({ code: "not_found" });
    expect(dependencies.links.deleteLink).not.toHaveBeenCalled();
  });
});
