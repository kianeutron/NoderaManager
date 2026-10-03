import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { createdAt, id, tsvector, updatedAt } from "./columns";
import { organizations, people, prospects, routes, users } from "./core";
import { campaigns } from "./strategy";
import { documentCategoryValues, documentLinkRelationValues, extractionStatusValues, maxFolderDepth, versionUploadStatusValues } from "./library-values";

export const documentCategoryEnum = pgEnum("document_category", documentCategoryValues);
export const versionUploadStatusEnum = pgEnum("version_upload_status", versionUploadStatusValues);
export const extractionStatusEnum = pgEnum("extraction_status", extractionStatusValues);
export const documentLinkRelationEnum = pgEnum("document_link_relation", documentLinkRelationValues);

export const folders = pgTable("folders", {
  id: id(),
  parentId: uuid("parent_id").references((): AnyPgColumn => folders.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  depth: smallint("depth").notNull().default(0),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("folders_name_length", sql`char_length(${table.name}) between 1 and 80`),
  check("folders_depth_range", sql`${table.depth} between 0 and ${sql.raw(String(maxFolderDepth))}`),
  check("folders_root_has_depth_zero", sql`(${table.parentId} is not null or ${table.depth} = 0)`),
  uniqueIndex("folders_root_name_unique").on(table.normalizedName).where(sql`${table.parentId} is null`),
  uniqueIndex("folders_sibling_name_unique").on(table.parentId, table.normalizedName).where(sql`${table.parentId} is not null`),
  index("folders_parent_id_index").on(table.parentId)
]);

export const documents = pgTable("documents", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  category: documentCategoryEnum("category").notNull().default("other"),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "restrict" }),
  currentVersionId: uuid("current_version_id").references((): AnyPgColumn => documentVersions.id, { onDelete: "restrict" }),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("documents_title_length", sql`char_length(${table.title}) between 1 and 200`),
  check("documents_description_length", sql`(${table.description} is null or char_length(${table.description}) <= 2000)`),
  index("documents_category_index").on(table.category),
  index("documents_folder_id_index").on(table.folderId),
  index("documents_created_at_index").on(table.createdAt),
  // Partial indexes matching the two keyset sort orders (see document-ordering.ts) for active documents.
  index("documents_updated_sort_index").on(sql`${table.updatedAt} desc`, sql`${table.id} desc`).where(sql`${table.archivedAt} is null`),
  index("documents_title_sort_index").on(sql`lower(${table.title})`, table.id).where(sql`${table.archivedAt} is null`),
  index("documents_title_trgm_index").using("gin", sql`${table.title} gin_trgm_ops`)
]);

export const documentVersions = pgTable("document_versions", {
  id: id(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "restrict" }),
  versionNumber: integer("version_number").notNull(),
  blobKey: text("blob_key").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  uploadStatus: versionUploadStatusEnum("upload_status").notNull().default("pending"),
  extractionStatus: extractionStatusEnum("extraction_status").notNull().default("pending"),
  extractionError: text("extraction_error"),
  changeNote: text("change_note"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  createdAt: createdAt()
}, (table) => [
  check("document_versions_number_positive", sql`${table.versionNumber} >= 1`),
  check("document_versions_size_positive", sql`${table.sizeBytes} > 0`),
  check("document_versions_filename_length", sql`char_length(${table.originalFilename}) between 1 and 255`),
  check("document_versions_change_note_length", sql`(${table.changeNote} is null or char_length(${table.changeNote}) <= 500)`),
  check("document_versions_uploaded_at_matches_status", sql`((${table.uploadStatus} = 'uploaded') = (${table.uploadedAt} is not null))`),
  uniqueIndex("document_versions_document_number_unique").on(table.documentId, table.versionNumber),
  uniqueIndex("document_versions_blob_key_unique").on(table.blobKey),
  index("document_versions_document_checksum_index").on(table.documentId, table.checksumSha256)
]);

export const documentSearchText = pgTable("document_search_text", {
  documentVersionId: uuid("document_version_id").primaryKey().references(() => documentVersions.id, { onDelete: "restrict" }),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "restrict" }),
  extractedText: text("extracted_text").notNull(),
  searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('simple', extracted_text)`),
  createdAt: createdAt()
}, (table) => [
  index("document_search_text_document_id_index").on(table.documentId),
  index("document_search_text_vector_index").using("gin", table.searchVector)
]);

export const tags = pgTable("tags", {
  id: id(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  createdAt: createdAt()
}, (table) => [
  check("tags_name_length", sql`char_length(${table.name}) between 1 and 40`),
  uniqueIndex("tags_normalized_name_unique").on(table.normalizedName)
]);

/**
 * Explicit nullable foreign keys keep referential integrity per entity type.
 * Exactly one target column is set per row. Add a column here when another entity becomes taggable.
 */
export const tagLinks = pgTable("tag_links", {
  id: id(),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "restrict" }),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "restrict" }),
  personId: uuid("person_id").references(() => people.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  prospectId: uuid("prospect_id").references(() => prospects.id, { onDelete: "restrict" }),
  createdAt: createdAt()
}, (table) => [
  check("tag_links_single_target", sql`num_nonnulls(${table.documentId}, ${table.personId}, ${table.organizationId}, ${table.prospectId}) = 1`),
  uniqueIndex("tag_links_document_unique").on(table.tagId, table.documentId).where(sql`${table.documentId} is not null`),
  uniqueIndex("tag_links_person_unique").on(table.tagId, table.personId).where(sql`${table.personId} is not null`),
  uniqueIndex("tag_links_organization_unique").on(table.tagId, table.organizationId).where(sql`${table.organizationId} is not null`),
  uniqueIndex("tag_links_prospect_unique").on(table.tagId, table.prospectId).where(sql`${table.prospectId} is not null`),
  index("tag_links_document_id_index").on(table.documentId)
]);

/**
 * Links a logical document (optionally pinned to one version) to a domain entity.
 * Exactly one target column is set per row.
 */
export const documentLinks = pgTable("document_links", {
  id: id(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "restrict" }),
  documentVersionId: uuid("document_version_id").references(() => documentVersions.id, { onDelete: "restrict" }),
  relation: documentLinkRelationEnum("relation").notNull().default("reference"),
  personId: uuid("person_id").references(() => people.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  prospectId: uuid("prospect_id").references(() => prospects.id, { onDelete: "restrict" }),
  routeId: uuid("route_id").references(() => routes.id, { onDelete: "restrict" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "restrict" }),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: createdAt()
}, (table) => [
  check("document_links_single_target", sql`num_nonnulls(${table.personId}, ${table.organizationId}, ${table.prospectId}, ${table.routeId}, ${table.campaignId}) = 1`),
  uniqueIndex("document_links_person_unique").on(table.documentId, table.personId, table.relation).where(sql`${table.personId} is not null`),
  uniqueIndex("document_links_organization_unique").on(table.documentId, table.organizationId, table.relation).where(sql`${table.organizationId} is not null`),
  uniqueIndex("document_links_prospect_unique").on(table.documentId, table.prospectId, table.relation).where(sql`${table.prospectId} is not null`),
  uniqueIndex("document_links_route_unique").on(table.documentId, table.routeId, table.relation).where(sql`${table.routeId} is not null`),
  uniqueIndex("document_links_campaign_unique").on(table.documentId, table.campaignId, table.relation).where(sql`${table.campaignId} is not null`),
  index("document_links_person_id_index").on(table.personId),
  index("document_links_organization_id_index").on(table.organizationId),
  index("document_links_prospect_id_index").on(table.prospectId),
  index("document_links_route_id_index").on(table.routeId),
  index("document_links_campaign_id_index").on(table.campaignId)
]);
