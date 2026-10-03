    # Database Schema Rules

    ## IDs

Use UUIDv7 or another sortable opaque ID strategy consistently. Do not expose sequential database IDs externally.

## Time

Use `timestamptz` in Postgres and store UTC. Convert only at display boundaries.

## Tables

Identity: `users`, `organizations`, `organization_domains`, `people`, `person_emails`, `person_links`.

Strategy: `routes`, `route_modules`, `campaigns`, `campaign_routes`, `campaign_prospects`, `signals`.

Pipeline and engagement: `prospects`, `outreach_messages`, `interactions`, `follow_ups`.

Knowledge: `notes`, `note_links`, `tags`, `tag_links`, `folders`, `documents`, `document_versions`, `document_links`, `document_search_text`.

Platform: `external_refs`, `audit_events`, `idempotency_keys`.

Drizzle definitions live in `src/shared/db/schema/`, split by domain (`core.ts`, `strategy.ts`, `engagement.ts`, `notes.ts`, `integration.ts`, `library.ts`). Closed value lists are dependency-free (`crm-values.ts`, `library-values.ts`) so the browser and MCP schemas can import them; the database enums are built from the same arrays.

## Constraints

Enforce important invariants in both service logic and database constraints where practical:

- normalized emails unique where appropriate;
- canonical domains unique;
- route module unique per route/name;
- external source + external ID unique;
- idempotency keys unique per operation/source;
- no follow-up due date without active follow-up status;
- foreign keys with explicit delete behavior;
- a module belongs to the route it is paired with (composite foreign key on `(route_id, route_module_id)`, used by prospects, outreach messages and campaign routes);
- one-of-target tables (`tag_links`, `note_links`, `document_links`, `external_refs`) use one nullable foreign key per target and a `num_nonnulls(...) = 1` check;
- country codes are uppercase ISO 3166-1 alpha-2;
- only an active follow-up may carry a due date;
- a bounced message is never marked delivered;
- response depth is 1 to 9.

Prefer `RESTRICT` for identity/history data. Avoid cascade deletion of outreach/audit history.

## Soft deletion

Do not default to soft delete everywhere. For records that must disappear from normal views while preserving history, use explicit archival fields (`archived_at`, present on organizations, people, prospects, routes, route modules, campaigns, folders and documents) rather than a generic hidden `deleted_at` policy. Audit history is immutable.

## Sort indexes

Every keyset-paginated list needs an index that matches its `ORDER BY` exactly, including direction and expression. Documents use partial indexes over active rows: `(updated_at desc, id desc)` and `(lower(title), id)`. Drizzle emits `NULLS LAST` for `.desc()`, which does not match a default `ORDER BY ... DESC`; declare such indexes with `sql` so the plan can use them.
