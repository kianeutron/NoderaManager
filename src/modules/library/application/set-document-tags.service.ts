import { requireActiveDocument } from "@/modules/library/application/document-guards";
import type { DocumentCommandsRepository } from "@/modules/library/data/document-commands.repository";
import type { DocumentRepository } from "@/modules/library/data/document.repository";
import type { SetDocumentTagsInput } from "@/modules/library/domain/document-commands.schema";
import type { SetDocumentTagsResult } from "@/modules/library/domain/document.types";
import { normalizeText } from "@/shared/lib/normalize-text";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";

type SetDocumentTagsDependencies = Readonly<{
  documents: Pick<DocumentCommandsRepository, "findDocumentState" | "ensureTags" | "replaceTags">;
  reads: Pick<DocumentRepository, "listTagNames">;
}>;

function sameTagSet(left: readonly string[], right: readonly string[]): boolean {
  const normalized = new Set(left.map(normalizeText));
  return normalized.size === right.length && right.every((name) => normalized.has(normalizeText(name)));
}

/** Replaces the whole tag set, which makes the command naturally idempotent. */
export async function setDocumentTags({ documents, reads }: SetDocumentTagsDependencies, actor: AuthenticatedActor, input: SetDocumentTagsInput): Promise<SetDocumentTagsResult> {
  const document = await requireActiveDocument(documents, input.documentId);
  const currentTags = (await reads.listTagNames([document.id])).get(document.id) ?? [];
  if (sameTagSet(currentTags, input.tags)) return { documentId: document.id, tags: currentTags, changed: false, auditEventId: null };

  const storedTags = await documents.ensureTags(input.tags);
  const tagNames = storedTags.map((tag) => tag.name);
  const auditEventId = await documents.replaceTags(document.id, storedTags.map((tag) => tag.id), toAuditEvent(actor, {
    action: "document.tags_set",
    entityType: "document",
    entityId: document.id,
    summary: `Set ${input.tags.length} tag(s) on "${document.title}"`,
    metadata: { before: currentTags, after: tagNames }
  }));

  return { documentId: document.id, tags: tagNames, changed: true, auditEventId };
}
