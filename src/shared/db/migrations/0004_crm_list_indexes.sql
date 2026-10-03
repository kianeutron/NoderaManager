DROP INDEX "route_modules_route_name_unique";--> statement-breakpoint
DROP INDEX "routes_name_unique";--> statement-breakpoint
CREATE INDEX "organizations_updated_sort_index" ON "organizations" USING btree ("updated_at" desc,"id" desc) WHERE "organizations"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "organizations_name_sort_index" ON "organizations" USING btree ("normalized_name","id") WHERE "organizations"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "people_updated_sort_index" ON "people" USING btree ("updated_at" desc,"id" desc) WHERE "people"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "people_name_sort_index" ON "people" USING btree ("normalized_name","id") WHERE "people"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "person_emails_normalized_email_trgm_index" ON "person_emails" USING gin ("normalized_email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "prospects_updated_sort_index" ON "prospects" USING btree ("updated_at" desc,"id" desc) WHERE "prospects"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "route_modules_route_name_unique" ON "route_modules" USING btree ("route_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "routes_name_unique" ON "routes" USING btree (lower("name"));