-- Hand-reviewed after generation (drizzle-kit orders and casts some of this unsafely):
--   * the two irreversible column drops are guarded so they can never silently discard data;
--   * enum value changes map old values explicitly instead of casting them blindly;
--   * the unique index that composite foreign keys need is created before those keys;
--   * outreach rows are backfilled with their target and route before the new checks apply.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "people" WHERE "why_targeted" IS NOT NULL) THEN
    RAISE EXCEPTION 'people.why_targeted holds data. Move it to prospects.why_targeted before applying this migration.';
  END IF;
  IF EXISTS (SELECT 1 FROM "outreach_messages" WHERE "external_message_id" IS NOT NULL) THEN
    RAISE EXCEPTION 'outreach_messages.external_message_id holds data. Copy it into external_refs (message_id) before applying this migration.';
  END IF;
END $$;--> statement-breakpoint
CREATE TYPE "public"."bounce_status" AS ENUM('none', 'soft', 'hard', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."cta_type" AS ENUM('reply', 'call', 'referral_intro', 'share_cv', 'portfolio_review', 'other');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."external_ref_type" AS ENUM('message_id', 'thread_id', 'conversation_url', 'profile_id', 'import_record_id', 'other');--> statement-breakpoint
CREATE TYPE "public"."external_source" AS ENUM('gmail', 'linkedin', 'import', 'manual', 'other');--> statement-breakpoint
CREATE TYPE "public"."follow_up_status" AS ENUM('active', 'completed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."interaction_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('reply', 'auto_reply', 'bounce_notice', 'follow_up_message', 'call', 'meeting', 'other');--> statement-breakpoint
CREATE TYPE "public"."organization_size_band" AS ENUM('solo', '2_10', '11_50', '51_200', '201_1000', '1001_plus');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('company', 'agency', 'consultancy', 'recruiter', 'community', 'other');--> statement-breakpoint
CREATE TYPE "public"."person_link_type" AS ENUM('linkedin', 'website', 'github', 'portfolio', 'other');--> statement-breakpoint
CREATE TYPE "public"."persona" AS ENUM('recruiter', 'fractional_cto', 'agency_founder', 'agency_delivery_lead', 'engineering_leader', 'founder', 'consultant', 'referral_partner', 'other');--> statement-breakpoint
CREATE TYPE "public"."proof_point_type" AS ENUM('case_study', 'portfolio', 'tech_stack', 'experience', 'referral', 'certification', 'other');--> statement-breakpoint
CREATE TYPE "public"."prospect_source" AS ENUM('linkedin_search', 'referral', 'inbound', 'community', 'event', 'research_document', 'import', 'other');--> statement-breakpoint
CREATE TYPE "public"."prospect_temperature" AS ENUM('cold', 'warm', 'hot');--> statement-breakpoint
CREATE TYPE "public"."reply_status" AS ENUM('none', 'replied', 'auto_reply');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('positive', 'neutral', 'negative', 'unclear');--> statement-breakpoint
CREATE TYPE "public"."signal_type" AS ENUM('live_role', 'client_win', 'contractor_request', 'funding', 'leadership_change', 'content_activity', 'event', 'other');--> statement-breakpoint
CREATE TYPE "public"."structural_reason" AS ENUM('language', 'local_payroll', 'residency', 'clearance', 'compliance', 'other');--> statement-breakpoint
CREATE TABLE "person_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"person_id" uuid NOT NULL,
	"type" "person_link_type" NOT NULL,
	"url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prospect_id" uuid NOT NULL,
	"status" "follow_up_status" DEFAULT 'active' NOT NULL,
	"reason" text NOT NULL,
	"due_at" timestamp with time zone,
	"not_before_at" timestamp with time zone,
	"suggested_channel" "outreach_channel",
	"origin_outreach_message_id" uuid,
	"origin_interaction_id" uuid,
	"completed_at" timestamp with time zone,
	"dismissed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_ups_due_needs_active" CHECK (("follow_ups"."due_at" is null or "follow_ups"."status" = 'active')),
	CONSTRAINT "follow_ups_completed_at_matches_status" CHECK ((("follow_ups"."status" = 'completed') = ("follow_ups"."completed_at" is not null))),
	CONSTRAINT "follow_ups_dismissed_reason_matches_status" CHECK (("follow_ups"."dismissed_reason" is null or "follow_ups"."status" = 'dismissed')),
	CONSTRAINT "follow_ups_reason_length" CHECK (char_length("follow_ups"."reason") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prospect_id" uuid NOT NULL,
	"outreach_message_id" uuid,
	"direction" "interaction_direction" NOT NULL,
	"channel" "outreach_channel" NOT NULL,
	"type" "interaction_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"subject" text,
	"body" text,
	"response_depth" smallint,
	"sentiment" "sentiment",
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(subject, '') || ' ' || coalesce(body, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactions_response_depth_range" CHECK (("interactions"."response_depth" is null or "interactions"."response_depth" between 1 and 9))
);
--> statement-breakpoint
CREATE TABLE "external_refs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source" "external_source" NOT NULL,
	"ref_type" "external_ref_type" NOT NULL,
	"external_id" text NOT NULL,
	"person_id" uuid,
	"organization_id" uuid,
	"prospect_id" uuid,
	"outreach_message_id" uuid,
	"interaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_refs_single_target" CHECK (num_nonnulls("external_refs"."person_id", "external_refs"."organization_id", "external_refs"."prospect_id", "external_refs"."outreach_message_id", "external_refs"."interaction_id") = 1),
	CONSTRAINT "external_refs_external_id_length" CHECK (char_length("external_refs"."external_id") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"source" text NOT NULL,
	"key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"result_entity_type" text,
	"result_entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_keys_key_length" CHECK (char_length("idempotency_keys"."key") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "note_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"note_id" uuid NOT NULL,
	"person_id" uuid,
	"organization_id" uuid,
	"prospect_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_links_single_target" CHECK (num_nonnulls("note_links"."person_id", "note_links"."organization_id", "note_links"."prospect_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', body)) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_body_length" CHECK (char_length("notes"."body") between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "campaign_prospects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_routes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"route_module_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"goal" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"targeting_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_window_ordered" CHECK (("campaigns"."starts_at" is null or "campaigns"."ends_at" is null or "campaigns"."ends_at" >= "campaigns"."starts_at")),
	CONSTRAINT "campaigns_name_length" CHECK (char_length("campaigns"."name") between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prospect_id" uuid NOT NULL,
	"type" "signal_type" NOT NULL,
	"summary" text NOT NULL,
	"source_url" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signals_summary_length" CHECK (char_length("signals"."summary") between 1 and 500),
	CONSTRAINT "signals_expiry_after_observation" CHECK (("signals"."expires_at" is null or "signals"."expires_at" >= "signals"."observed_at"))
);
--> statement-breakpoint
ALTER TABLE "document_links" DROP CONSTRAINT "document_links_single_target";--> statement-breakpoint
ALTER TABLE "prospects" DROP CONSTRAINT "prospects_route_module_id_route_modules_id_fk";
--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "suggested_channel" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "interactions" ALTER COLUMN "channel" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "outreach_messages" ALTER COLUMN "channel" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."outreach_channel";--> statement-breakpoint
CREATE TYPE "public"."outreach_channel" AS ENUM('email', 'linkedin', 'inmail', 'other');--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "suggested_channel" SET DATA TYPE "public"."outreach_channel" USING "suggested_channel"::"public"."outreach_channel";--> statement-breakpoint
ALTER TABLE "interactions" ALTER COLUMN "channel" SET DATA TYPE "public"."outreach_channel" USING "channel"::"public"."outreach_channel";--> statement-breakpoint
ALTER TABLE "outreach_messages" ALTER COLUMN "channel" SET DATA TYPE "public"."outreach_channel" USING (CASE "channel" WHEN 'referral' THEN 'other' WHEN 'community' THEN 'other' ELSE "channel" END)::"public"."outreach_channel";--> statement-breakpoint
ALTER TABLE "prospects" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "prospects" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."prospect_status";--> statement-breakpoint
CREATE TYPE "public"."prospect_status" AS ENUM('researched', 'ready', 'contacted', 'replied', 'warm', 'opportunity', 'proposal', 'won', 'lost', 'dormant', 'disqualified');--> statement-breakpoint
ALTER TABLE "prospects" ALTER COLUMN "status" SET DATA TYPE "public"."prospect_status" USING (CASE "status" WHEN 'researching' THEN 'researched' WHEN 'engaged' THEN 'replied' WHEN 'paused' THEN 'dormant' WHEN 'closed' THEN 'lost' ELSE "status" END)::"public"."prospect_status";--> statement-breakpoint
ALTER TABLE "prospects" ALTER COLUMN "status" SET DEFAULT 'researched';--> statement-breakpoint
DROP INDEX "outreach_messages_external_id_unique";--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "metadata_version" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "organization_type" "organization_type" DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "size_band" "organization_size_band";--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "person_id" uuid;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "route_id" uuid;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "route_module_id" uuid;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "signal_id" uuid;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "cta_type" "cta_type";--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "proof_point_type" "proof_point_type";--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "delivery_status" "delivery_status" DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "bounce_status" "bounce_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "reply_status" "reply_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(subject, '') || ' ' || body)) STORED;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "outreach_messages" AS m SET "person_id" = p."person_id", "organization_id" = p."organization_id", "route_id" = p."route_id", "route_module_id" = p."route_module_id" FROM "prospects" AS p WHERE p."id" = m."prospect_id";--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "persona" "persona";--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "languages" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "do_not_contact_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "do_not_contact_reason" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "last_contacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "person_emails" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "status_changed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "temperature" "prospect_temperature";--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "source" "prospect_source";--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "why_targeted" text;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "current_trigger" text;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "structural_reason" "structural_reason";--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "last_contacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(why_targeted, '') || ' ' || coalesce(current_trigger, '') || ' ' || coalesce(next_action, ''))) STORED;--> statement-breakpoint
ALTER TABLE "route_modules" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "route_modules" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "route_modules" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "document_links" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "route_modules_route_id_id_unique" ON "route_modules" USING btree ("route_id","id");--> statement-breakpoint
ALTER TABLE "person_links" ADD CONSTRAINT "person_links_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_origin_outreach_message_id_outreach_messages_id_fk" FOREIGN KEY ("origin_outreach_message_id") REFERENCES "public"."outreach_messages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_origin_interaction_id_interactions_id_fk" FOREIGN KEY ("origin_interaction_id") REFERENCES "public"."interactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_outreach_message_id_outreach_messages_id_fk" FOREIGN KEY ("outreach_message_id") REFERENCES "public"."outreach_messages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refs" ADD CONSTRAINT "external_refs_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refs" ADD CONSTRAINT "external_refs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refs" ADD CONSTRAINT "external_refs_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refs" ADD CONSTRAINT "external_refs_outreach_message_id_outreach_messages_id_fk" FOREIGN KEY ("outreach_message_id") REFERENCES "public"."outreach_messages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refs" ADD CONSTRAINT "external_refs_interaction_id_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_prospects" ADD CONSTRAINT "campaign_prospects_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_prospects" ADD CONSTRAINT "campaign_prospects_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_routes" ADD CONSTRAINT "campaign_routes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_routes" ADD CONSTRAINT "campaign_routes_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_routes" ADD CONSTRAINT "campaign_routes_route_module_in_route_fk" FOREIGN KEY ("route_id","route_module_id") REFERENCES "public"."route_modules"("route_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "person_links_person_url_unique" ON "person_links" USING btree ("person_id","normalized_url");--> statement-breakpoint
CREATE INDEX "follow_ups_prospect_id_index" ON "follow_ups" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "follow_ups_active_due_index" ON "follow_ups" USING btree ("due_at") WHERE "follow_ups"."status" = 'active';--> statement-breakpoint
CREATE INDEX "interactions_prospect_occurred_index" ON "interactions" USING btree ("prospect_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interactions_outreach_message_id_index" ON "interactions" USING btree ("outreach_message_id");--> statement-breakpoint
CREATE INDEX "interactions_response_depth_index" ON "interactions" USING btree ("response_depth") WHERE "interactions"."response_depth" is not null;--> statement-breakpoint
CREATE INDEX "interactions_search_vector_index" ON "interactions" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "external_refs_message_id_unique" ON "external_refs" USING btree ("source","external_id") WHERE "external_refs"."ref_type" = 'message_id';--> statement-breakpoint
CREATE UNIQUE INDEX "external_refs_person_unique" ON "external_refs" USING btree ("source","ref_type","external_id","person_id") WHERE "external_refs"."person_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "external_refs_organization_unique" ON "external_refs" USING btree ("source","ref_type","external_id","organization_id") WHERE "external_refs"."organization_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "external_refs_prospect_unique" ON "external_refs" USING btree ("source","ref_type","external_id","prospect_id") WHERE "external_refs"."prospect_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "external_refs_outreach_message_unique" ON "external_refs" USING btree ("source","ref_type","external_id","outreach_message_id") WHERE "external_refs"."outreach_message_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "external_refs_interaction_unique" ON "external_refs" USING btree ("source","ref_type","external_id","interaction_id") WHERE "external_refs"."interaction_id" is not null;--> statement-breakpoint
CREATE INDEX "external_refs_lookup_index" ON "external_refs" USING btree ("source","ref_type","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_operation_source_key_unique" ON "idempotency_keys" USING btree ("operation","source","key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_index" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "note_links_person_unique" ON "note_links" USING btree ("note_id","person_id") WHERE "note_links"."person_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "note_links_organization_unique" ON "note_links" USING btree ("note_id","organization_id") WHERE "note_links"."organization_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "note_links_prospect_unique" ON "note_links" USING btree ("note_id","prospect_id") WHERE "note_links"."prospect_id" is not null;--> statement-breakpoint
CREATE INDEX "note_links_person_id_index" ON "note_links" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "note_links_organization_id_index" ON "note_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "note_links_prospect_id_index" ON "note_links" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "notes_search_vector_index" ON "notes" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_prospects_campaign_prospect_unique" ON "campaign_prospects" USING btree ("campaign_id","prospect_id");--> statement-breakpoint
CREATE INDEX "campaign_prospects_prospect_id_index" ON "campaign_prospects" USING btree ("prospect_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_routes_whole_route_unique" ON "campaign_routes" USING btree ("campaign_id","route_id") WHERE "campaign_routes"."route_module_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_routes_module_unique" ON "campaign_routes" USING btree ("campaign_id","route_id","route_module_id") WHERE "campaign_routes"."route_module_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_normalized_name_unique" ON "campaigns" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "campaigns_status_index" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "signals_prospect_id_index" ON "signals" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "signals_type_index" ON "signals" USING btree ("type");--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_route_module_in_route_fk" FOREIGN KEY ("route_id","route_module_id") REFERENCES "public"."route_modules"("route_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_route_module_in_route_fk" FOREIGN KEY ("route_id","route_module_id") REFERENCES "public"."route_modules"("route_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_domains_one_canonical_unique" ON "organization_domains" USING btree ("organization_id") WHERE "organization_domains"."is_canonical";--> statement-breakpoint
CREATE INDEX "organizations_normalized_name_trgm_index" ON "organizations" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "organizations_country_code_index" ON "organizations" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "outreach_messages_prospect_sent_index" ON "outreach_messages" USING btree ("prospect_id","sent_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "outreach_messages_sent_at_index" ON "outreach_messages" USING btree ("sent_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "outreach_messages_organization_id_index" ON "outreach_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "outreach_messages_person_id_index" ON "outreach_messages" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "outreach_messages_campaign_id_index" ON "outreach_messages" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "outreach_messages_channel_index" ON "outreach_messages" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "outreach_messages_search_vector_index" ON "outreach_messages" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "people_persona_index" ON "people" USING btree ("persona");--> statement-breakpoint
CREATE INDEX "people_country_code_index" ON "people" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "people_last_contacted_at_index" ON "people" USING btree ("last_contacted_at");--> statement-breakpoint
CREATE INDEX "people_normalized_name_trgm_index" ON "people" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "person_emails_one_primary_unique" ON "person_emails" USING btree ("person_id") WHERE "person_emails"."is_primary";--> statement-breakpoint
CREATE INDEX "person_emails_person_id_index" ON "person_emails" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "prospects_route_id_index" ON "prospects" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "prospects_person_id_index" ON "prospects" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "prospects_organization_id_index" ON "prospects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prospects_last_contacted_at_index" ON "prospects" USING btree ("last_contacted_at");--> statement-breakpoint
CREATE INDEX "prospects_search_vector_index" ON "prospects" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "document_links_campaign_unique" ON "document_links" USING btree ("document_id","campaign_id","relation") WHERE "document_links"."campaign_id" is not null;--> statement-breakpoint
CREATE INDEX "document_links_campaign_id_index" ON "document_links" USING btree ("campaign_id");--> statement-breakpoint
ALTER TABLE "outreach_messages" DROP COLUMN "external_message_id";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "why_targeted";--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_country_code_iso" CHECK (("organizations"."country_code" is null or "organizations"."country_code" ~ '^[A-Z]{2}$'));--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_has_target" CHECK (("outreach_messages"."person_id" is not null or "outreach_messages"."organization_id" is not null));--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_module_needs_route" CHECK (("outreach_messages"."route_module_id" is null or "outreach_messages"."route_id" is not null));--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_bounced_not_delivered" CHECK (not ("outreach_messages"."bounce_status" <> 'none' and "outreach_messages"."delivery_status" = 'delivered'));--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_country_code_iso" CHECK (("people"."country_code" is null or "people"."country_code" ~ '^[A-Z]{2}$'));--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_do_not_contact_reason_needs_flag" CHECK (("people"."do_not_contact_reason" is null or "people"."do_not_contact_at" is not null));--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_single_target" CHECK (num_nonnulls("document_links"."person_id", "document_links"."organization_id", "document_links"."prospect_id", "document_links"."route_id", "document_links"."campaign_id") = 1);