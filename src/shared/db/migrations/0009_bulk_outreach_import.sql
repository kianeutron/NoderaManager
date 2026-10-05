CREATE TABLE "bulk_outreach_imports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"source" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text DEFAULT 'previewed' NOT NULL,
	"payload" jsonb NOT NULL,
	"plan" jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"commit_idempotency_key" text,
	"expires_at" timestamp with time zone NOT NULL,
	"committed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bulk_outreach_imports_actor_fingerprint_unique" ON "bulk_outreach_imports" USING btree ("actor_id","source","request_fingerprint");