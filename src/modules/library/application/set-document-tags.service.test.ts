import { describe, expect, it, vi } from "vitest";
import { setDocumentTags } from "@/modules/library/application/set-document-tags.service";
import { setDocumentTagsInputSchema } from "@/modules/library/domain/document-commands.schema";
import { createActor } from "@/test/factories/actors";

const documentId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

function createDependencies(currentTags: string[]) {
  return {
    documents: {
      findDocumentState: vi.fn().mockResolvedValue({ id: documentId, title: "Deck", archivedAt: null }),
      ensureTags: vi.fn().mockResolvedValue([{ id: "t1", name: "Q3" }, { id: "t2", name: "Pitch" }]),
      replaceTags: vi.fn().mockResolvedValue("audit-1")
    },
    reads: { listTagNames: vi.fn().mockResolvedValue(new Map([[documentId, currentTags]])) }
  };
}

const parse = (tags: string[]) => setDocumentTagsInputSchema.parse({ documentId, tags });

describe("setDocumentTags", () => {
  it("replaces the tag set and audits the before and after", async () => {
    const dependencies = createDependencies(["Old"]);
    const result = await setDocumentTags(dependencies, createActor(), parse(["Q3", "Pitch"]));

    expect(dependencies.documents.replaceTags).toHaveBeenCalledWith(documentId, ["t1", "t2"], expect.objectContaining({ action: "document.tags_set", metadata: { before: ["Old"], after: ["Q3", "Pitch"] } }));
    expect(result).toEqual({ documentId, tags: ["Q3", "Pitch"], changed: true, auditEventId: "audit-1" });
  });

  it("reports and audits the names as stored, which keep the first spelling used", async () => {
    const dependencies = createDependencies([]);
    dependencies.documents.ensureTags.mockResolvedValue([{ id: "t1", name: "Q3 Deck" }]);
    const result = await setDocumentTags(dependencies, createActor(), parse(["q3 deck"]));

    expect(result.tags).toEqual(["Q3 Deck"]);
    expect(dependencies.documents.replaceTags).toHaveBeenCalledWith(documentId, ["t1"], expect.objectContaining({ metadata: { before: [], after: ["Q3 Deck"] } }));
  });

  it("is a no-op when the set is already equal, ignoring case and order", async () => {
    const dependencies = createDependencies(["q3", "PITCH"]);
    const result = await setDocumentTags(dependencies, createActor(), parse(["Pitch", "Q3"]));

    expect(result).toEqual({ documentId, tags: ["q3", "PITCH"], changed: false, auditEventId: null });
    expect(dependencies.documents.replaceTags).not.toHaveBeenCalled();
    expect(dependencies.documents.ensureTags).not.toHaveBeenCalled();
  });

  it("clears all tags with an empty list", async () => {
    const dependencies = createDependencies(["Old"]);
    dependencies.documents.ensureTags.mockResolvedValue([]);
    const result = await setDocumentTags(dependencies, createActor(), parse([]));

    expect(dependencies.documents.replaceTags).toHaveBeenCalledWith(documentId, [], expect.anything());
    expect(result.changed).toBe(true);
  });
});
