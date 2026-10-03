    # MCP Tool Catalog

    Initial read tools:

- `search_people`
- `get_person`
- `search_organizations`
- `get_organization`
- `find_duplicate_candidates`
- `get_contact_history`
- `search_prospects`
- `get_prospect`
- `list_routes` (active routes and modules with the ids `create_prospect` needs), `get_route_overview` (with live counts)
- `search_campaigns`, `get_campaign`, `list_campaign_prospects`, `suggest_campaign_prospects`
- `search_library`
- `get_document_metadata`
- `get_document_text` (bounded, untrusted document text)
- `get_library_facets` (categories, tags and folders with the ids other tools need)
- `get_overview` (the Overview page's figures for 7, 30 or 90 days, each against the period before; replaces the planned `get_dashboard_summary`)
- `get_analytics` (the Analytics page: trend, funnel, reply time, best send times, deliverability, for 7 to 365 days)
- `get_performance_breakdown` (messages split by route, module, persona, country, company type, channel, campaign or source; replaces the planned route, persona and country statistics tools)
- `search_followups` (what is due: `due=overdue`, `next_7_days`, `later`, `no_date`; replaces the planned `get_due_followups`)

Initial write tools:

- `create_person`, `update_person`, `set_person_emails`, `set_person_links`
- `archive_person`, `restore_person`, `archive_organization`, `restore_organization` (hide from lists; nothing is deleted; `search_*` with `scope: archived` finds them)
- `mark_person_do_not_contact`, `clear_person_do_not_contact` (only on the owner's explicit instruction)
- `create_organization`, `update_organization`, `set_organization_domains`
- `create_route`, `create_route_module`, `update_route`, `update_route_module`, `archive_route`, `restore_route`, `archive_route_module`, `restore_route_module` (with the read tool `list_routes` for ids)
- `create_campaign`, `update_campaign`, `set_campaign_routes`, `set_campaign_status`, `archive_campaign`, `restore_campaign`, `add_campaign_prospects`, `unlink_campaign_prospects` (the link-removal tools are the only destructive ones: they delete a link, never a record)
- `create_prospect`, `update_prospect`, `update_prospect_status`
- `add_signal`
- `log_outreach` (only for messages already sent; pass an `idempotencyKey`; optional `campaignId` for an active campaign the prospect belongs to)
- `search_outreach`, `get_outreach_message`
- `log_interaction` (their replies, calls, meetings, follow-ups we sent; only for what already happened; pass an `idempotencyKey`)
- `log_bounce` (soft, hard or blocked; repeating it is a no-op)
- `list_interactions` (a prospect's timeline)
- `create_followup` (a reason and optional due / not-before dates and suggested channel; pair it with status `dormant` for a timing-only no), `update_followup`, `complete_followup`, `dismiss_followup`
- `add_note`
- `link_document`
- `unlink_document` (removes one relationship only; annotated destructive so clients confirm)
- `create_text_document`, `add_document_version` (markdown/plain text only; see library commands)
- `update_document`, `set_document_tags`
- `archive_document`, `restore_document` (the reversible meaning of "delete")
- `create_folder`, `rename_folder`, `archive_folder`

Do NOT expose initially:

- arbitrary SQL;
- generic table CRUD;
- hard delete;
- bulk purge;
- secret/config reads;
- raw Blob credentials;
- tool that sends email/LinkedIn itself. External sending remains in the corresponding connector/app.

## Tool annotations

Mark read-only tools as read-only. Mark mutations honestly. Descriptions must state side effects and idempotency behavior. Keep schemas strict; reject unknown fields for sensitive commands.

## Scopes

Read tools need `outreach.read`. Every write tool additionally needs `outreach.write`, enforced per tool with the SDK's scope challenge: a read-only token calling a write tool receives HTTP 403 with `WWW-Authenticate: Bearer error="insufficient_scope", scope="outreach.write"` so the client can ask the user for more access. Both scopes are advertised in the protected-resource metadata.

## Behavior every CRM tool shares

- **Search tools** filter server-side, return compact rows and page with `nextCursor` / `cursor` (keyset; see the pagination rules). `total` is present only on the first page.
- **Create tools** run the shared duplicate rules and are idempotent where the docs allow: a repeated `create_prospect`, `create_route`, `create_route_module`, `add_signal` or `add_note` returns the existing record (`created: false`, `auditEventId: null`). `create_person` and `create_organization` block on exact duplicates instead, and name the existing record.
- **Update tools** change only fields that differ. Omitted means unchanged; `null` clears an optional field. A repeat is a no-op. Free text (notes, qualification text) is named as changed in the audit trail but never copied into it.
- **Every write** returns `auditEventId` (null when nothing changed).
