ALTER TABLE "outreach_sequence_steps" DROP CONSTRAINT IF EXISTS "outreach_sequence_steps_stop_on_reply_boolean";--> statement-breakpoint
ALTER TABLE "outreach_sequence_steps" ALTER COLUMN "stop_on_reply" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "outreach_sequence_steps" ALTER COLUMN "stop_on_reply" SET DATA TYPE boolean USING ("stop_on_reply" = 1);--> statement-breakpoint
ALTER TABLE "outreach_sequence_steps" ALTER COLUMN "stop_on_reply" SET DEFAULT true;
