import { describe, expect, it, vi } from "vitest";
import { createTextDocument } from "@/modules/library/application/create-text-document.service";
import type { NewDocumentDraft } from "@/modules/library/data/document-commands.repository";
import { createTextDocumentInputSchema } from "@/modules/library/domain/document-commands.schema";
import { LibraryCommandError } from "@/modules/library/domain/library-errors";
import { sha256Hex } from "@/modules/library/domain/text-content";
import { createActor } from "@/test/factories/actors";

const folderId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d01";

function createDependencies(overrides: { reusable?: unknown; folder?: unknown; insert?: () => Promise<string> } = {}) {
  return {
    documents: {
      findReusableDocument: vi.fn().mockResolvedValue(overrides.reusable ?? null),
      ensureTags: vi.fn().mockResolvedValue([{ id: "tag-id-1", name: "Q3" }]),
      insertDocumentWithVersion: vi.fn<(draft: NewDocumentDraft) => Promise<string>>(overrides.insert ?? (async () => "audit-1"))
    },
    folders: { findFolder: vi.fn().mockResolvedValue("folder" in overrides ? overrides.folder : { id: folderId, archivedAt: null, depth: 0 }) },
    blobStore: { save: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) },
    resolveOwnerUserId: vi.fn().mockResolvedValue("owner-user-id")
  };
}

const input = createTextDocumentInputSchema.parse({ title: "Q3 research", content: "# Findings", category: "research", tags: ["Q3"], folderId });

describe("createTextDocument", () => {
  it("stores the text privately, then commits document, first version, tags and audit together", async () => {
    const dependencies = createDependencies();
    const result = await createTextDocument(dependencies, createActor(), input);

    const [blobKey, body, mimeType] = dependencies.blobStore.save.mock.calls[0] ?? [];
    expect(body).toBe("# Findings");
    expect(mimeType).toBe("text/markdown");
    expect(blobKey).toMatch(/^documents\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);

    const draft = dependencies.documents.insertDocumentWithVersion.mock.calls[0]?.[0];
    if (!draft) throw new Error("expected the document to be committed");
    expect(draft).toMatchObject({ title: "Q3 research", category: "research", folderId, tagIds: ["tag-id-1"], version: { blobKey, originalFilename: "q3-research.md", mimeType: "text/markdown", sizeBytes: 10, extractedText: "# Findings", createdBy: "owner-user-id" } });
    expect(draft.version.checksumSha256).toBe(await sha256Hex("# Findings"));
    expect(draft.audit).toMatchObject({ actorType: "mcp", actorId: "actor-1", requestId: "request-1", source: "mcp", action: "document.created", entityType: "document", entityId: draft.documentId });
    expect(JSON.stringify(draft.audit)).not.toContain("Findings");

    expect(result).toEqual({ documentId: draft.documentId, versionId: draft.version.versionId, versionNumber: 1, created: true, auditEventId: "audit-1" });
  });

  it("is idempotent: identical title and content reuse the existing document and write nothing", async () => {
    const dependencies = createDependencies({ reusable: { documentId: "doc-1", versionId: "ver-1", versionNumber: 3 } });
    const result = await createTextDocument(dependencies, createActor(), input);

    expect(result).toEqual({ documentId: "doc-1", versionId: "ver-1", versionNumber: 3, created: false, auditEventId: null });
    expect(dependencies.blobStore.save).not.toHaveBeenCalled();
    expect(dependencies.documents.insertDocumentWithVersion).not.toHaveBeenCalled();
  });

  it("refuses an unknown or archived folder before storing anything", async () => {
    const missing = createDependencies({ folder: null });
    await expect(createTextDocument(missing, createActor(), input)).rejects.toThrow(LibraryCommandError);
    expect(missing.blobStore.save).not.toHaveBeenCalled();

    const archived = createDependencies({ folder: { id: folderId, archivedAt: new Date(), depth: 0 } });
    await expect(createTextDocument(archived, createActor(), input)).rejects.toMatchObject({ code: "not_found" });
  });

  it("removes the stored bytes if the database commit fails, and still reports the original error", async () => {
    const dependencies = createDependencies({ insert: async () => { throw new Error("commit failed"); } });

    await expect(createTextDocument(dependencies, createActor(), input)).rejects.toThrow("commit failed");
    expect(dependencies.blobStore.remove).toHaveBeenCalledWith(dependencies.blobStore.save.mock.calls[0]?.[0]);
  });

  it("does not let a failed cleanup hide the original error", async () => {
    const dependencies = createDependencies({ insert: async () => { throw new Error("commit failed"); } });
    dependencies.blobStore.remove.mockRejectedValue(new Error("cleanup failed"));

    await expect(createTextDocument(dependencies, createActor(), input)).rejects.toThrow("commit failed");
  });
});
