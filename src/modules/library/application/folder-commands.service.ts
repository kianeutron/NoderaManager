import { v7 as uuidv7 } from "uuid";
import { requireActiveFolder } from "@/modules/library/application/document-guards";
import type { FolderRepository } from "@/modules/library/data/folder.repository";
import type { ArchiveFolderInput, CreateFolderInput, RenameFolderInput } from "@/modules/library/domain/folder-commands.schema";
import type { FolderResult } from "@/modules/library/domain/document.types";
import { normalizeText } from "@/shared/lib/normalize-text";
import { LibraryCommandError } from "@/modules/library/domain/library-errors";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { maxFolderDepth } from "@/shared/db/schema/library-values";

/** Idempotent: creating a folder that already exists under the same parent returns it unchanged. */
export async function createFolder(folders: Pick<FolderRepository, "findFolder" | "findActiveSibling" | "insertFolder">, actor: AuthenticatedActor, input: CreateFolderInput): Promise<FolderResult> {
  const parent = input.parentId ? await requireActiveFolder(folders, input.parentId) : null;
  const depth = parent ? parent.depth + 1 : 0;
  if (depth > maxFolderDepth) throw new LibraryCommandError("limit_exceeded", `Folders can be nested at most ${maxFolderDepth + 1} levels deep`);

  const normalizedName = normalizeText(input.name);
  const existing = await folders.findActiveSibling(parent?.id ?? null, normalizedName);
  if (existing) return { folderId: existing.id, name: existing.name, depth: existing.depth, changed: false, auditEventId: null };

  const folderId = uuidv7();
  const auditEventId = await folders.insertFolder({
    folderId,
    parentId: parent?.id ?? null,
    name: input.name,
    normalizedName,
    depth,
    audit: toAuditEvent(actor, { action: "folder.created", entityType: "folder", entityId: folderId, summary: `Created folder "${input.name}"`, metadata: { parentId: parent?.id ?? null, depth } })
  });

  return { folderId, name: input.name, depth, changed: true, auditEventId };
}

export async function renameFolder(folders: Pick<FolderRepository, "findFolder" | "findActiveSibling" | "renameFolder">, actor: AuthenticatedActor, input: RenameFolderInput): Promise<FolderResult> {
  const folder = await requireActiveFolder(folders, input.folderId);
  if (folder.name === input.name) return { folderId: folder.id, name: folder.name, depth: folder.depth, changed: false, auditEventId: null };

  const normalizedName = normalizeText(input.name);
  if (await folders.findActiveSibling(folder.parentId, normalizedName, folder.id)) throw new LibraryCommandError("conflict", "A folder with that name already exists here");

  const auditEventId = await folders.renameFolder(folder.id, input.name, normalizedName, toAuditEvent(actor, {
    action: "folder.renamed",
    entityType: "folder",
    entityId: folder.id,
    summary: `Renamed folder "${folder.name}" to "${input.name}"`,
    metadata: { before: folder.name, after: input.name }
  }));

  return { folderId: folder.id, name: input.name, depth: folder.depth, changed: true, auditEventId };
}

/** Only an empty folder can be archived, so no document or subfolder is ever hidden by accident. */
export async function archiveFolder(folders: Pick<FolderRepository, "findFolder" | "countActiveChildren" | "countActiveDocuments" | "archiveFolder">, actor: AuthenticatedActor, input: ArchiveFolderInput): Promise<FolderResult> {
  const folder = await folders.findFolder(input.folderId);
  if (!folder) throw new LibraryCommandError("not_found", "Folder not found");
  if (folder.archivedAt !== null) return { folderId: folder.id, name: folder.name, depth: folder.depth, changed: false, auditEventId: null };

  const [childCount, documentCount] = await Promise.all([folders.countActiveChildren(folder.id), folders.countActiveDocuments(folder.id)]);
  if (childCount > 0 || documentCount > 0) throw new LibraryCommandError("conflict", "Only an empty folder can be archived: move or archive its documents and subfolders first");

  const auditEventId = await folders.archiveFolder(folder.id, toAuditEvent(actor, { action: "folder.archived", entityType: "folder", entityId: folder.id, summary: `Archived folder "${folder.name}"`, metadata: {} }));
  return { folderId: folder.id, name: folder.name, depth: folder.depth, changed: true, auditEventId };
}
