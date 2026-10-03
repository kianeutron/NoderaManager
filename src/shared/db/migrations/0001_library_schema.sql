CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('proposal', 'contract', 'pitch_deck', 'case_study', 'one_pager', 'portfolio', 'research', 'template', 'report', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_link_relation" AS ENUM('reference', 'sent', 'received');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('pending', 'processing', 'ready', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."version_upload_status" AS ENUM('pending', 'uploaded', 'failed');--> statement-breakpoint
CREATE TABLE "document_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"document_version_id" uuid,
	"relation" "document_link_relation" DEFAULT 'reference' NOT NULL,
	"person_id" uuid,
	"organization_id" uuid,
	"prospect_id" uuid,
	"route_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_links_single_target" CHECK (num_nonnulls("document_links"."person_id", "document_links"."organization_id", "document_links"."prospect_id", "document_links"."route_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "document_search_text" (
	"document_version_id" uuid PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"extracted_text" text NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', extracted_text)) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"blob_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" text NOT NULL,
	"upload_status" "version_upload_status" DEFAULT 'pending' NOT NULL,
	"extraction_status" "extraction_status" DEFAULT 'pending' NOT NULL,
	"extraction_error" text,
	"change_note" text,
	"created_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_versions_number_positive" CHECK ("document_versions"."version_number" >= 1),
	CONSTRAINT "document_versions_size_positive" CHECK ("document_versions"."size_bytes" > 0),
	CONSTRAINT "document_versions_filename_length" CHECK (char_length("document_versions"."original_filename") between 1 and 255),
	CONSTRAINT "document_versions_change_note_length" CHECK (("document_versions"."change_note" is null or char_length("document_versions"."change_note") <= 500)),
	CONSTRAINT "document_versions_uploaded_at_matches_status" CHECK ((("document_versions"."upload_status" = 'uploaded') = ("document_versions"."uploaded_at" is not null)))
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" "document_category" DEFAULT 'other' NOT NULL,
	"folder_id" uuid,
	"current_version_id" uuid,
	"created_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_title_length" CHECK (char_length("documents"."title") between 1 and 200),
	CONSTRAINT "documents_description_length" CHECK (("documents"."description" is null or char_length("documents"."description") <= 2000))
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"depth" smallint DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "folders_name_length" CHECK (char_length("folders"."name") between 1 and 80),
	CONSTRAINT "folders_depth_range" CHECK ("folders"."depth" between 0 and 3),
	CONSTRAINT "folders_root_has_depth_zero" CHECK (("folders"."parent_id" is not null or "folders"."depth" = 0))
);
--> statement-breakpoint
CREATE TABLE "tag_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tag_id" uuid NOT NULL,
	"document_id" uuid,
	"person_id" uuid,
	"organization_id" uuid,
	"prospect_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_links_single_target" CHECK (num_nonnulls("tag_links"."document_id", "tag_links"."person_id", "tag_links"."organization_id", "tag_links"."prospect_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_length" CHECK (char_length("tags"."name") between 1 and 40)
);
--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_search_text" ADD CONSTRAINT "document_search_text_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_search_text" ADD CONSTRAINT "document_search_text_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_current_version_id_document_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_links" ADD CONSTRAINT "tag_links_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_links" ADD CONSTRAINT "tag_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_links" ADD CONSTRAINT "tag_links_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_links" ADD CONSTRAINT "tag_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_links" ADD CONSTRAINT "tag_links_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_links_person_unique" ON "document_links" USING btree ("document_id","person_id","relation") WHERE "document_links"."person_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "document_links_organization_unique" ON "document_links" USING btree ("document_id","organization_id","relation") WHERE "document_links"."organization_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "document_links_prospect_unique" ON "document_links" USING btree ("document_id","prospect_id","relation") WHERE "document_links"."prospect_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "document_links_route_unique" ON "document_links" USING btree ("document_id","route_id","relation") WHERE "document_links"."route_id" is not null;--> statement-breakpoint
CREATE INDEX "document_links_person_id_index" ON "document_links" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "document_links_organization_id_index" ON "document_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "document_links_prospect_id_index" ON "document_links" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "document_links_route_id_index" ON "document_links" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "document_search_text_document_id_index" ON "document_search_text" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_search_text_vector_index" ON "document_search_text" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_document_number_unique" ON "document_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_blob_key_unique" ON "document_versions" USING btree ("blob_key");--> statement-breakpoint
CREATE INDEX "document_versions_document_checksum_index" ON "document_versions" USING btree ("document_id","checksum_sha256");--> statement-breakpoint
CREATE INDEX "documents_category_index" ON "documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "documents_folder_id_index" ON "documents" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "documents_created_at_index" ON "documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "documents_title_trgm_index" ON "documents" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "folders_root_name_unique" ON "folders" USING btree ("normalized_name") WHERE "folders"."parent_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "folders_sibling_name_unique" ON "folders" USING btree ("parent_id","normalized_name") WHERE "folders"."parent_id" is not null;--> statement-breakpoint
CREATE INDEX "folders_parent_id_index" ON "folders" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_links_document_unique" ON "tag_links" USING btree ("tag_id","document_id") WHERE "tag_links"."document_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "tag_links_person_unique" ON "tag_links" USING btree ("tag_id","person_id") WHERE "tag_links"."person_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "tag_links_organization_unique" ON "tag_links" USING btree ("tag_id","organization_id") WHERE "tag_links"."organization_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "tag_links_prospect_unique" ON "tag_links" USING btree ("tag_id","prospect_id") WHERE "tag_links"."prospect_id" is not null;--> statement-breakpoint
CREATE INDEX "tag_links_document_id_index" ON "tag_links" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_normalized_name_unique" ON "tags" USING btree ("normalized_name");