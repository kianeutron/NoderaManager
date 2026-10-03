import { v7 as uuidv7 } from "uuid";
import { requireActiveDocument } from "@/modules/library/application/document-guards";
import type { DocumentCommandsRepository } from "@/modules/library/data/document-commands.repository";
import type { DocumentLinkRepository } from "@/modules/library/data/document-link.repository";
import type { LinkDocumentInput, UnlinkDocumentInput } from "@/modules/library/domain/document-commands.schema";
import type { LinkDocumentResult, UnlinkDocumentResult } from "@/modules/library/domain/document.types";
import { LibraryCommandError } from "@/modules/library/domain/library-errors";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";

type DocumentLinksDependencies = Readonly<{
  documents: Pick<DocumentCommandsRepository, "findDocumentState">;
  links: Pick<DocumentLinkRepository, "targetExists" | "versionBelongsToDocument" | "findLink" | "findLinkById" | "insertLink" | "deleteLink">;
  resolveOwnerUserId: () => Promise<string>;
}>;

/** Idempotent: an identical link (same document, target and relation) is returned unchanged rather than duplicated. */
export async function linkDocument({ documents, links, resolveOwnerUserId }: DocumentLinksDependencies, actor: AuthenticatedActor, input: LinkDocumentInput): Promise<LinkDocumentResult> {
  const document = await requireActiveDocument(documents, input.documentId);
  const target = { targetType: input.targetType, targetId: input.targetId };

  if (!(await links.targetExists(target))) throw new LibraryCommandError("not_found", `The ${input.targetType} to link was not found`);
  if (input.versionId && !(await links.versionBelongsToDocument(input.versionId, document.id))) throw new LibraryCommandError("not_found", "That version does not belong to this document");

  const existing = await links.findLink(document.id, target, input.relation);
  if (existing) return { linkId: existing.id, created: false, auditEventId: null };

  const linkId = uuidv7();
  const auditEventId = await links.insertLink({
    ...target,
    linkId,
    documentId: document.id,
    versionId: input.versionId ?? null,
    relation: input.relation,
    createdBy: await resolveOwnerUserId(),
    audit: toAuditEvent(actor, {
      action: "document.linked",
      entityType: "document",
      entityId: document.id,
      summary: `Linked "${document.title}" to a ${input.targetType} (${input.relation})`,
      metadata: { linkId, ...target, relation: input.relation, versionId: input.versionId ?? null }
    })
  });

  return { linkId, created: true, auditEventId };
}

/** Removes only the relationship; the document and the linked record are untouched. */
export async function unlinkDocument({ links }: Pick<DocumentLinksDependencies, "links">, actor: AuthenticatedActor, input: UnlinkDocumentInput): Promise<UnlinkDocumentResult> {
  const link = await links.findLinkById(input.linkId);
  if (!link) throw new LibraryCommandError("not_found", "Link not found");

  const auditEventId = await links.deleteLink(link.id, toAuditEvent(actor, {
    action: "document.unlinked",
    entityType: "document",
    entityId: link.documentId,
    summary: "Removed a document link",
    metadata: { linkId: link.id }
  }));

  return { linkId: link.id, auditEventId };
}
