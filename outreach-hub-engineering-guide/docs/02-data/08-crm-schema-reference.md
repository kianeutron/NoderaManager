# CRM Schema Reference

Per-table meaning and rules. Drizzle definitions: `src/shared/db/schema/`. Closed value lists: `crm-values.ts`, `library-values.ts`. Timestamps are `timestamptz`; ids are UUIDv7; deletes are `RESTRICT`.

## Identity

| Table | Holds | Rules |
| --- | --- | --- |
| `organizations` | company, agency, consultancy, recruiter, community | `organization_type` (default `company`), optional `size_band`, ISO `country_code`, `archived_at`. Name search uses a trigram index. |
| `organization_domains` | domains of an organization | A domain is globally unique; at most one canonical domain per organization. |
| `people` | identity of a human | LinkedIn identity is unique. `persona`, `languages` (ISO 639-1), ISO `country_code`, `last_contacted_at`, `archived_at`. `do_not_contact_at` with an optional reason (a reason requires the flag). Why someone was targeted, status and temperature live on the prospect, not here. |
| `person_emails` | email addresses | Normalized email is globally unique; at most one primary per person. |
| `person_links` | profiles beyond the canonical LinkedIn identity | One row per person and normalized URL. |

## Strategy

| Table | Holds | Rules |
| --- | --- | --- |
| `routes`, `route_modules` | acquisition strategies and their tactics | Names are unique (module names per route). Both can be archived. Channels are not routes. |
| `campaigns` | a bounded initiative | Unique normalized name, `status` (`draft`, `active`, `paused`, `completed`), optional window where the end is not before the start, `targeting_rules` JSON validated at the boundary. |
| `campaign_routes` | campaign to route or module | A null module means the whole route. The module must belong to the route. |
| `campaign_prospects` | campaign membership | One row per campaign and prospect. |
| `signals` | evidence that makes contact timely | `type`, short `summary`, `observed_at`, optional `expires_at` (not before observation). |

## Pipeline and engagement

| Table | Holds | Rules |
| --- | --- | --- |
| `prospects` | qualification context for a person or organization | Names a person or an organization. Route required; a module must belong to that route. `status` (default `researched`, `status_changed_at`), `temperature`, `source`, `why_targeted`, `current_trigger`, `structural_reason`, `next_action`, `last_contacted_at`, `archived_at`. Full-text index over the three free-text fields. |
| `outreach_messages` | the exact message that was sent | Target person and/or organization, route, module and campaign are copied at send time. `cta_type`, `proof_point_type`, optional `signal_id`. `delivery_status` defaults to `sent` (unconfirmed), `bounce_status`, `reply_status`. A bounced message is never `delivered`. Full-text index over subject and body. Corrections are updates plus audit events. |
| `interactions` | replies and later communication | `direction`, `channel`, `type`, `occurred_at`, optional `response_depth` (1 to 9) and `sentiment`, set only by explicit classification. Optionally tied to the outreach it answers. |
| `follow_ups` | explicit tasks | `status` `active`, `completed` or `dismissed`. Only an active follow-up may carry `due_at`; `not_before_at` expresses "not before" leads. `completed_at` exists exactly when completed; a dismissal reason only when dismissed. May originate from an outreach or interaction. |

## Knowledge

| Table | Holds | Rules |
| --- | --- | --- |
| `notes`, `note_links` | free-text notes | A note can be linked to several people, organizations or prospects; each link row has exactly one target and a note is linked to a record once. Full-text index. |
| `tags`, `tag_links` | free-form labels | See [document metadata](../06-library/04-document-metadata.md). |
| `folders`, `documents`, `document_versions`, `document_links`, `document_search_text` | the library | See the library docs. Document links can target a person, organization, prospect, route or campaign. |

## Platform

| Table | Holds | Rules |
| --- | --- | --- |
| `external_refs` | identifiers from other systems | `source` (`gmail`, `linkedin`, `import`, `manual`, `other`), `ref_type` (`message_id`, `thread_id`, `conversation_url`, `profile_id`, `import_record_id`, `other`), one target record. A `message_id` is unique per source; a thread id may tag many records. |
| `idempotency_keys` | replay protection | Unique per operation, source and key. Stores a request fingerprint to spot a reused key with a different payload, plus the result record and an expiry. |
| `audit_events` | immutable change history | `metadata_version` records the shape of `metadata`. Append-only. |

## Not modelled yet

Import staging (`upload -> parse -> normalize -> validate -> dedupe preview -> confirm -> commit`) arrives with the imports phase, and reference-data seeding (initial routes and modules) has no runner yet.
