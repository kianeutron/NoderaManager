CREATE TYPE "public"."draft_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."outreach_task_status" AS ENUM('open', 'in_progress', 'completed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."outreach_task_type" AS ENUM('follow_up', 'review', 'research', 'reply', 'other');--> statement-breakpoint
CREATE TYPE "public"."provider_account_status" AS ENUM('active', 'reauthorization_required', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."sequence_enrollment_status" AS ENUM('active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sequence_status" AS ENUM('draft', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "campaign_daily_stats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"day" date NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"positive_reply_count" integer DEFAULT 0 NOT NULL,
	"meeting_count" integer DEFAULT 0 NOT NULL,
	"opportunity_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_daily_stats_counts_nonnegative" CHECK ("campaign_daily_stats"."sent_count" >= 0 and "campaign_daily_stats"."delivered_count" >= 0 and "campaign_daily_stats"."reply_count" >= 0 and "campaign_daily_stats"."positive_reply_count" >= 0 and "campaign_daily_stats"."meeting_count" >= 0 and "campaign_daily_stats"."opportunity_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "outreach_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prospect_id" uuid NOT NULL,
	"person_id" uuid,
	"organization_id" uuid,
	"campaign_id" uuid,
	"template_id" uuid,
	"channel" "outreach_channel" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" "draft_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_drafts_has_target" CHECK (("outreach_drafts"."person_id" is not null or "outreach_drafts"."organization_id" is not null)),
	CONSTRAINT "outreach_drafts_scheduled_at_matches_status" CHECK (("outreach_drafts"."status" <> 'scheduled' or "outreach_drafts"."scheduled_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "outreach_provider_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_account_id" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "provider_account_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_provider_accounts_provider_length" CHECK (char_length("outreach_provider_accounts"."provider") between 1 and 40)
);
--> statement-breakpoint
CREATE TABLE "outreach_sequence_enrollments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sequence_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"current_step_order" smallint DEFAULT 1 NOT NULL,
	"status" "sequence_enrollment_status" DEFAULT 'active' NOT NULL,
	"next_run_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_sequence_enrollments_step_positive" CHECK ("outreach_sequence_enrollments"."current_step_order" >= 1),
	CONSTRAINT "outreach_sequence_enrollments_completed_matches_status" CHECK ((("outreach_sequence_enrollments"."status" = 'completed') = ("outreach_sequence_enrollments"."completed_at" is not null)))
);
--> statement-breakpoint
CREATE TABLE "outreach_sequence_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sequence_id" uuid NOT NULL,
	"step_order" smallint NOT NULL,
	"delay_hours" integer DEFAULT 0 NOT NULL,
	"template_id" uuid NOT NULL,
	"channel" "outreach_channel" NOT NULL,
	"stop_on_reply" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_sequence_steps_order_positive" CHECK ("outreach_sequence_steps"."step_order" >= 1),
	CONSTRAINT "outreach_sequence_steps_delay_nonnegative" CHECK ("outreach_sequence_steps"."delay_hours" >= 0),
	CONSTRAINT "outreach_sequence_steps_stop_on_reply_boolean" CHECK ("outreach_sequence_steps"."stop_on_reply" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE "outreach_sequences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"status" "sequence_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_sequences_name_length" CHECK (char_length("outreach_sequences"."name") between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "outreach_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prospect_id" uuid NOT NULL,
	"campaign_id" uuid,
	"origin_message_id" uuid,
	"origin_interaction_id" uuid,
	"assignee_id" uuid,
	"type" "outreach_task_type" DEFAULT 'follow_up' NOT NULL,
	"status" "outreach_task_status" DEFAULT 'open' NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_tasks_title_length" CHECK (char_length("outreach_tasks"."title") between 1 and 200),
	CONSTRAINT "outreach_tasks_completed_matches_status" CHECK ((("outreach_tasks"."status" = 'completed') = ("outreach_tasks"."completed_at" is not null)))
);
--> statement-breakpoint
CREATE TABLE "outreach_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"channel" "outreach_channel" NOT NULL,
	"subject_template" text,
	"body_template" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "template_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_templates_name_length" CHECK (char_length("outreach_templates"."name") between 1 and 120),
	CONSTRAINT "outreach_templates_body_length" CHECK (char_length("outreach_templates"."body_template") between 1 and 20000)
);
--> statement-breakpoint
ALTER TABLE "campaign_daily_stats" ADD CONSTRAINT "campaign_daily_stats_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_template_id_outreach_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."outreach_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_provider_accounts" ADD CONSTRAINT "outreach_provider_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequence_enrollments" ADD CONSTRAINT "outreach_sequence_enrollments_sequence_id_outreach_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."outreach_sequences"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequence_enrollments" ADD CONSTRAINT "outreach_sequence_enrollments_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequence_steps" ADD CONSTRAINT "outreach_sequence_steps_sequence_id_outreach_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."outreach_sequences"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequence_steps" ADD CONSTRAINT "outreach_sequence_steps_template_id_outreach_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."outreach_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequences" ADD CONSTRAINT "outreach_sequences_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_tasks" ADD CONSTRAINT "outreach_tasks_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_tasks" ADD CONSTRAINT "outreach_tasks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_tasks" ADD CONSTRAINT "outreach_tasks_origin_message_id_outreach_messages_id_fk" FOREIGN KEY ("origin_message_id") REFERENCES "public"."outreach_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_tasks" ADD CONSTRAINT "outreach_tasks_origin_interaction_id_interactions_id_fk" FOREIGN KEY ("origin_interaction_id") REFERENCES "public"."interactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_tasks" ADD CONSTRAINT "outreach_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_daily_stats_campaign_day_unique" ON "campaign_daily_stats" USING btree ("campaign_id","day");--> statement-breakpoint
CREATE INDEX "campaign_daily_stats_day_index" ON "campaign_daily_stats" USING btree ("day");--> statement-breakpoint
CREATE INDEX "outreach_drafts_prospect_index" ON "outreach_drafts" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "outreach_drafts_status_schedule_index" ON "outreach_drafts" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_provider_accounts_external_unique" ON "outreach_provider_accounts" USING btree ("provider","external_account_id");--> statement-breakpoint
CREATE INDEX "outreach_provider_accounts_user_index" ON "outreach_provider_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_sequence_enrollments_sequence_prospect_unique" ON "outreach_sequence_enrollments" USING btree ("sequence_id","prospect_id");--> statement-breakpoint
CREATE INDEX "outreach_sequence_enrollments_due_index" ON "outreach_sequence_enrollments" USING btree ("next_run_at") WHERE "outreach_sequence_enrollments"."status" = 'active';--> statement-breakpoint
CREATE INDEX "outreach_sequence_enrollments_prospect_index" ON "outreach_sequence_enrollments" USING btree ("prospect_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_sequence_steps_order_unique" ON "outreach_sequence_steps" USING btree ("sequence_id","step_order");--> statement-breakpoint
CREATE INDEX "outreach_sequence_steps_template_index" ON "outreach_sequence_steps" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_sequences_campaign_name_unique" ON "outreach_sequences" USING btree ("campaign_id","normalized_name");--> statement-breakpoint
CREATE INDEX "outreach_sequences_status_index" ON "outreach_sequences" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outreach_tasks_prospect_index" ON "outreach_tasks" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "outreach_tasks_assignee_due_index" ON "outreach_tasks" USING btree ("assignee_id","due_at");--> statement-breakpoint
CREATE INDEX "outreach_tasks_open_due_index" ON "outreach_tasks" USING btree ("due_at") WHERE "outreach_tasks"."status" in ('open', 'in_progress');--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_templates_normalized_name_channel_unique" ON "outreach_templates" USING btree ("normalized_name","channel");--> statement-breakpoint
CREATE INDEX "outreach_templates_status_index" ON "outreach_templates" USING btree ("status");
