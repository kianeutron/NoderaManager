import type { DocumentFileInfo, DocumentLinkView, DocumentSummary, DocumentVersionView, ExtractionStatus, LibraryFolder, DocumentDetail } from "@/modules/library/domain/document.types";
import type { DocumentCategory } from "@/modules/library/domain/document.schema";
import { buildFolderPath } from "@/modules/library/domain/folder-path";
import type { DocumentRepository } from "@/modules/library/data/document.repository";

type Rows<Method extends keyof DocumentRepository> = Awaited<ReturnType<DocumentRepository[Method]>>;
type CurrentFileRow = Readonly<{
  versionNumber: number | null;
  mimeType: string | null;
  sizeBytes: number | null;
  originalFilename: string | null;
  extractionStatus: ExtractionStatus | null;
}>;
type SummaryRow = CurrentFileRow & Readonly<{ id: string; title: string; category: DocumentCategory; updatedAt: Date }>;

// The five columns come from one left join, so they are all present or all null.
function toFileInfo(row: CurrentFileRow): DocumentFileInfo | null {
  const { versionNumber, mimeType, sizeBytes, originalFilename, extractionStatus } = row;
  if (versionNumber === null || mimeType === null || sizeBytes === null || originalFilename === null || extractionStatus === null) return null;
  return { versionNumber, mimeType, sizeBytes, originalFilename, extractionStatus };
}

export function toDocumentSummary(row: SummaryRow, tagNames: readonly string[]): DocumentSummary {
  return { id: row.id, title: row.title, category: row.category, tags: tagNames, file: toFileInfo(row), updatedAt: row.updatedAt.toISOString() };
}

export function toDocumentLinkView(row: Rows<"listLinks">[number]): DocumentLinkView | null {
  const base = { id: row.id, relation: row.relation };
  if (row.personId && row.personName) return { ...base, targetType: "person", targetId: row.personId, label: row.personName };
  if (row.organizationId && row.organizationName) return { ...base, targetType: "organization", targetId: row.organizationId, label: row.organizationName };
  if (row.routeId && row.routeName) return { ...base, targetType: "route", targetId: row.routeId, label: row.routeName };
  if (row.campaignId && row.campaignName) return { ...base, targetType: "campaign", targetId: row.campaignId, label: row.campaignName };
  if (row.prospectId) return { ...base, targetType: "prospect", targetId: row.prospectId, label: row.prospectPersonName ?? row.prospectOrganizationName ?? "Prospect" };
  return null;
}

function toVersionViews(rows: Rows<"listVersions">, currentVersionNumber: number | null): DocumentVersionView[] {
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), isCurrent: row.versionNumber === currentVersionNumber }));
}

type DocumentDetailParts = Readonly<{
  row: NonNullable<Rows<"findDocument">>;
  tagNames: readonly string[];
  versions: Rows<"listVersions">;
  links: Rows<"listLinks">;
  folders: readonly LibraryFolder[];
}>;

export function toDocumentDetail({ row, tagNames, versions, links, folders }: DocumentDetailParts): DocumentDetail {
  return {
    ...toDocumentSummary(row, tagNames),
    description: row.description,
    folderPath: buildFolderPath(folders, row.folderId),
    versions: toVersionViews(versions, row.versionNumber),
    links: links.flatMap((link) => toDocumentLinkView(link) ?? [])
  };
}
