import { and, eq } from "drizzle-orm";
import type { LinkTargetType } from "@/modules/library/domain/document-commands.schema";
import type { DocumentLinkRelation } from "@/modules/library/domain/document.types";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { organizations, people, prospects, routes } from "@/shared/db/schema/core";
import { campaigns } from "@/shared/db/schema/strategy";
import { documentLinks, documentVersions } from "@/shared/db/schema/library";

type LibraryDatabase = ReturnType<typeof getDatabase>;

export type LinkTarget = Readonly<{ targetType: LinkTargetType; targetId: string }>;

export type NewLinkDraft = LinkTarget & Readonly<{ linkId: string; documentId: string; versionId: string | null; relation: DocumentLinkRelation; createdBy: string; audit: AuditEventInput }>;

// Each link row has one nullable foreign key per target type (see schema); these map a target onto its column.
const linkColumns = {
  person: documentLinks.personId,
  organization: documentLinks.organizationId,
  prospect: documentLinks.prospectId,
  route: documentLinks.routeId,
  campaign: documentLinks.campaignId
} as const satisfies Record<LinkTargetType, unknown>;

function linkColumnValues({ targetType, targetId }: LinkTarget) {
  return {
    personId: targetType === "person" ? targetId : null,
    organizationId: targetType === "organization" ? targetId : null,
    prospectId: targetType === "prospect" ? targetId : null,
    routeId: targetType === "route" ? targetId : null,
    campaignId: targetType === "campaign" ? targetId : null
  };
}

export function createDocumentLinkRepository(database: LibraryDatabase) {
  const targetTables = { person: people, organization: organizations, prospect: prospects, route: routes, campaign: campaigns } as const satisfies Record<LinkTargetType, { id: unknown }>;

  return {
    targetExists: async ({ targetType, targetId }: LinkTarget): Promise<boolean> => {
      const table = targetTables[targetType];
      const [row] = await database.select({ id: table.id }).from(table).where(eq(table.id, targetId)).limit(1);
      return row !== undefined;
    },

    versionBelongsToDocument: async (versionId: string, documentId: string): Promise<boolean> => {
      const [row] = await database.select({ id: documentVersions.id }).from(documentVersions).where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId))).limit(1);
      return row !== undefined;
    },

    findLink: async (documentId: string, target: LinkTarget, relation: DocumentLinkRelation) => {
      const [row] = await database.select({ id: documentLinks.id }).from(documentLinks)
        .where(and(eq(documentLinks.documentId, documentId), eq(documentLinks.relation, relation), eq(linkColumns[target.targetType], target.targetId)))
        .limit(1);
      return row ?? null;
    },

    findLinkById: async (linkId: string) => {
      const [row] = await database.select({ id: documentLinks.id, documentId: documentLinks.documentId }).from(documentLinks).where(eq(documentLinks.id, linkId)).limit(1);
      return row ?? null;
    },

    insertLink: async (draft: NewLinkDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, draft.audit);
      await database.batch([
        database.insert(documentLinks).values({ id: draft.linkId, documentId: draft.documentId, documentVersionId: draft.versionId, relation: draft.relation, createdBy: draft.createdBy, ...linkColumnValues(draft) }),
        audit.statement
      ]);
      return audit.id;
    },

    deleteLink: async (linkId: string, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.delete(documentLinks).where(eq(documentLinks.id, linkId)), audit.statement]);
      return audit.id;
    }
  };
}

export type DocumentLinkRepository = ReturnType<typeof createDocumentLinkRepository>;
