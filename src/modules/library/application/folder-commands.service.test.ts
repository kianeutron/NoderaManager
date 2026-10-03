import { describe, expect, it, vi } from "vitest";
import { archiveFolder, createFolder, renameFolder } from "@/modules/library/application/folder-commands.service";
import { createActor } from "@/test/factories/actors";

const parentId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d01";

function createFolders(overrides: { folder?: unknown; sibling?: unknown; children?: number; documents?: number } = {}) {
  return {
    findFolder: vi.fn().mockResolvedValue("folder" in overrides ? overrides.folder : { id: parentId, parentId: null, name: "Sales", normalizedName: "sales", depth: 0, archivedAt: null }),
    findActiveSibling: vi.fn().mockResolvedValue(overrides.sibling ?? null),
    countActiveChildren: vi.fn().mockResolvedValue(overrides.children ?? 0),
    countActiveDocuments: vi.fn().mockResolvedValue(overrides.documents ?? 0),
    insertFolder: vi.fn().mockResolvedValue("audit-1"),
    renameFolder: vi.fn().mockResolvedValue("audit-2"),
    archiveFolder: vi.fn().mockResolvedValue("audit-3")
  };
}

describe("createFolder", () => {
  it("creates a root folder at depth 0", async () => {
    const folders = createFolders();
    const result = await createFolder(folders, createActor(), { name: "Research" });

    expect(folders.insertFolder).toHaveBeenCalledWith(expect.objectContaining({ parentId: null, name: "Research", normalizedName: "research", depth: 0, audit: expect.objectContaining({ action: "folder.created" }) }));
    expect(result).toMatchObject({ name: "Research", depth: 0, changed: true, auditEventId: "audit-1" });
  });

  it("nests one level below its parent", async () => {
    const folders = createFolders();
    await createFolder(folders, createActor(), { name: "Decks", parentId });

    expect(folders.insertFolder).toHaveBeenCalledWith(expect.objectContaining({ parentId, depth: 1 }));
  });

  it("refuses to nest deeper than four levels", async () => {
    const folders = createFolders({ folder: { id: parentId, parentId: "x", name: "L4", normalizedName: "l4", depth: 3, archivedAt: null } });

    await expect(createFolder(folders, createActor(), { name: "Too deep", parentId })).rejects.toMatchObject({ code: "limit_exceeded" });
    expect(folders.insertFolder).not.toHaveBeenCalled();
  });

  it("is idempotent: an existing sibling with the same name is returned unchanged", async () => {
    const folders = createFolders({ sibling: { id: "existing", name: "Research", depth: 0 } });
    const result = await createFolder(folders, createActor(), { name: "research" });

    expect(result).toEqual({ folderId: "existing", name: "Research", depth: 0, changed: false, auditEventId: null });
    expect(folders.insertFolder).not.toHaveBeenCalled();
  });

  it("refuses an unknown or archived parent", async () => {
    await expect(createFolder(createFolders({ folder: null }), createActor(), { name: "x", parentId })).rejects.toMatchObject({ code: "not_found" });
    await expect(createFolder(createFolders({ folder: { id: parentId, archivedAt: new Date(), depth: 0 } }), createActor(), { name: "x", parentId })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("renameFolder", () => {
  it("renames and audits before and after", async () => {
    const folders = createFolders();
    const result = await renameFolder(folders, createActor(), { folderId: parentId, name: "Revenue" });

    expect(folders.renameFolder).toHaveBeenCalledWith(parentId, "Revenue", "revenue", expect.objectContaining({ action: "folder.renamed", metadata: { before: "Sales", after: "Revenue" } }));
    expect(result).toMatchObject({ name: "Revenue", changed: true });
  });

  it("changes only the capitalization without tripping the uniqueness check on itself", async () => {
    const folders = createFolders();
    await renameFolder(folders, createActor(), { folderId: parentId, name: "SALES" });

    expect(folders.findActiveSibling).toHaveBeenCalledWith(null, "sales", parentId);
    expect(folders.renameFolder).toHaveBeenCalled();
  });

  it("rejects a name a sibling already uses", async () => {
    const folders = createFolders({ sibling: { id: "other", name: "Revenue", depth: 0 } });

    await expect(renameFolder(folders, createActor(), { folderId: parentId, name: "Revenue" })).rejects.toMatchObject({ code: "conflict" });
  });

  it("does nothing when the name is unchanged", async () => {
    const folders = createFolders();
    const result = await renameFolder(folders, createActor(), { folderId: parentId, name: "Sales" });

    expect(result).toMatchObject({ changed: false, auditEventId: null });
    expect(folders.renameFolder).not.toHaveBeenCalled();
  });
});

describe("archiveFolder", () => {
  it("archives an empty folder", async () => {
    const folders = createFolders();
    const result = await archiveFolder(folders, createActor(), { folderId: parentId });

    expect(folders.archiveFolder).toHaveBeenCalledWith(parentId, expect.objectContaining({ action: "folder.archived" }));
    expect(result).toMatchObject({ changed: true, auditEventId: "audit-3" });
  });

  it.each([[{ children: 1 }], [{ documents: 2 }]])("refuses while the folder still holds content %o", async (contents) => {
    const folders = createFolders(contents);

    await expect(archiveFolder(folders, createActor(), { folderId: parentId })).rejects.toMatchObject({ code: "conflict" });
    expect(folders.archiveFolder).not.toHaveBeenCalled();
  });

  it("is idempotent for an already archived folder and reports an unknown one", async () => {
    const archived = createFolders({ folder: { id: parentId, name: "Old", depth: 0, archivedAt: new Date() } });
    expect(await archiveFolder(archived, createActor(), { folderId: parentId })).toMatchObject({ changed: false, auditEventId: null });

    await expect(archiveFolder(createFolders({ folder: null }), createActor(), { folderId: parentId })).rejects.toMatchObject({ code: "not_found" });
  });
});
