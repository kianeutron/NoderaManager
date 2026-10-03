import type { DocumentCategory } from "@/modules/library/domain/document.schema";
import type { KeysetPage } from "@/shared/api/keyset";
import type { documentLinkRelationValues, extractionStatusValues } from "@/shared/db/schema/library-values";

// View models returned by the API. Timestamps are ISO strings because they cross the JSON boundary.

export type ExtractionStatus = (typeof extractionStatusValues)[number];
export type DocumentLinkRelation = (typeof documentLinkRelationValues)[number];
export type DocumentLinkTargetType = "person" | "organization" | "prospect" | "route" | "campaign";

export type DocumentFileInfo = Readonly<{
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  versionNumber: number;
  extractionStatus: ExtractionStatus;
}>;

export type DocumentSummary = Readonly<{
  id: string;
  title: string;
  category: DocumentCategory;
  tags: readonly string[];
  file: DocumentFileInfo | null;
  updatedAt: string;
}>;

export type DocumentPage = KeysetPage<DocumentSummary>;

export type FolderPathItem = Readonly<{ id: string; name: string }>;

export type DocumentVersionView = Readonly<{
  id: string;
  versionNumber: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  changeNote: string | null;
  createdAt: string;
  isCurrent: boolean;
}>;

export type DocumentLinkView = Readonly<{
  id: string;
  relation: DocumentLinkRelation;
  targetType: DocumentLinkTargetType;
  targetId: string;
  label: string;
}>;

export type DocumentDetail = DocumentSummary & Readonly<{
  description: string | null;
  folderPath: readonly FolderPathItem[];
  versions: readonly DocumentVersionView[];
  links: readonly DocumentLinkView[];
}>;

export type LibraryFolder = Readonly<{ id: string; parentId: string | null; name: string; depth: number }>;

export type LibraryFacets = Readonly<{
  total: number;
  categories: readonly Readonly<{ category: DocumentCategory; count: number }>[];
  tags: readonly Readonly<{ id: string; name: string; count: number }>[];
  folders: readonly LibraryFolder[];
}>;

// Results of write commands. `auditEventId` is null when the call changed nothing (an idempotent no-op).
type Audited = Readonly<{ auditEventId: string | null }>;

export type StoredVersionResult = Audited & Readonly<{ documentId: string; versionId: string; versionNumber: number; created: boolean }>;
export type UpdateDocumentResult = Audited & Readonly<{ documentId: string; changed: boolean }>;
export type SetDocumentTagsResult = Audited & Readonly<{ documentId: string; tags: readonly string[]; changed: boolean }>;
export type SetDocumentArchivedResult = Audited & Readonly<{ documentId: string; archived: boolean; changed: boolean }>;
export type LinkDocumentResult = Audited & Readonly<{ linkId: string; created: boolean }>;
export type UnlinkDocumentResult = Audited & Readonly<{ linkId: string }>;
export type FolderResult = Audited & Readonly<{ folderId: string; name: string; depth: number; changed: boolean }>;
export type DocumentTextResult = Readonly<{ documentId: string; text: string | null; totalCharacters: number; truncated: boolean }>;
