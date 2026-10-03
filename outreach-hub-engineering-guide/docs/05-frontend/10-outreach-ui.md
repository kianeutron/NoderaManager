# Outreach UI

Route `/outreach` (sidenav: Outreach). The log of messages that were **already sent**: browse, search, filter, open one, and log a new one. It records; it does not send or draft.

## Structure

`OutreachPage` uses the same pattern as People: `PreviewLayout` with a `PreviewDock`, a search field, a filter bar, and `KeysetResults` over an `EntityList`. Above the list, four counts (`OutreachSummaryCards`) come from one aggregate query over **all** messages, never from the page on screen.

- **URL is the state:** `?q=&channel=&reply=&id=` (`outreach-url-state.ts`, per-parameter fallback, defaults omitted). `useOutreachWorkspace` is the only place transitions are built.
- **Data:** `outreach-api.ts` (typed Hono client, `ApiRequestError`), `use-outreach-queries.ts` (keys, `useOutreachList` on the shared `useKeysetList`, detail, summary, targets), `use-outreach-mutations.ts`.
- **Preview:** read-only (a sent message is a record). It shows the recipient, channel, sent time, delivery, bounce (only if there was one), reply, the prospect's status and route, the subject and the whole text, with links to open the person or company on `/people`.
- **Conversation** (`InteractionsSection`, from `modules/interactions/ui`) sits under the message: the prospect's timeline plus **Log reply**, **Log activity** (call, meeting, follow-up, other) and **Report bounce**. A reply is tied to the message, marks it replied and moves the prospect; a bounce fails the message's delivery. The forms validate with the command schemas, send one idempotency key per opening, and ask only what applies: the direction only for call, meeting and other, the response depth only for something received.
- **Log form** (`LogOutreachForm`): prospect picker, an optional **Campaign** select (only when the chosen prospect is in an active campaign; it resets when the prospect changes), channel, sent time, subject, message. A tied message shows a `Campaign: <name>` chip in its preview. Validates with the command schema. Each opening of the form has its own `idempotencyKey`, so a double click or a retry after a dropped connection returns the first message. The picker only offers prospects a message can go to.

## Follow-ups

The second tab (`?view=followups`). Counts by due date (overdue, next 7 days, later, no date) sit over a list that reads soonest due first, undated last. Filters: Show (Active, Completed, Dismissed) and, for active ones, Due. A row shows who it is about, why, and how urgent ("Overdue by 3 days"); a finished one shows how it ended. The preview lets you **Complete**, **Edit** or **Dismiss** (asks why) an active follow-up, and only read a finished one, with links to open the person or company. It lives in `modules/followups/ui` and knows nothing about the Outreach page's URL: the page passes it plain props.

- **Adding:** the header button (with a prospect picker), **Schedule follow-up** in a message's preview (prospect fixed, the message remembered as the origin), and the dormant flow in the prospect status dialog. The form has quick choices (tomorrow, in a week, in a month, all at 9:00 local time), a not-before date and a suggested channel.
- **Overdue is judged by the browser's clock** in the rows and preview (one clock per mount, so it does not flicker); the counts and buckets are computed by the database in UTC instants, so they never depend on a timezone.

## API

`GET /api/outreach/messages` (keyset: `q`, `channel`, `replyStatus`, `prospectId`, `cursor`, `limit`), `GET /api/outreach/messages/:id`, `GET /api/outreach/summary`, `GET /api/outreach/targets?q=`, `POST /api/outreach/messages` (`201` when logged, `200` when an identical earlier message was found). Owner-only, writes rate-limited like every other router. Follow-ups: `GET /api/followups` (keyset: `status`, `due`, `prospectId`, `sort`), `GET /api/followups/summary`, `GET /api/followups/:id`, `POST /api/followups` (`201`, or `200` for an existing open one), `PATCH /api/followups/:id`, `POST /api/followups/:id/complete`, `POST /api/followups/:id/dismiss`.

Search matches people and company names as you type (escaped `ILIKE` on the normalized name) and words in the message through the full-text index (`simple` configuration, whole words). The list is ordered by `sent_at` using `outreach_messages_sent_at_index`; add a composite `(sent_at desc, id desc)` index if this list ever grows large.

## Rules (`domain/outreach-rules.ts`)

- A person marked **do-not-contact** is never logged to. This is a safety flag and nothing overrides it.
- A closed (won, lost, disqualified) or archived prospect, or an archived person (or archived company when there is no person), is refused with a reason the UI words.
- Who the message is filed under (person, organization, route, module) comes from the prospect, never from the caller.
- In the **same commit** as the message: the prospect's and person's `last_contacted_at` (never moved backwards by an older message) and, for a first contact, the prospect's status (`researched`/`ready` become `contacted`; later statuses stay).
- Idempotent: a repeated `idempotencyKey` returns the first message (same key with different text is refused as misuse); without a key, identical text to the same prospect on the same channel within ten minutes is treated as a double submit. The send time is left out of the comparison so a retry matches.
- The message text is never copied into the audit trail.

## MCP

`search_outreach`, `get_outreach_message` (read) and `log_outreach` (write); `list_interactions` (read), `log_interaction` and `log_bounce` (write); `search_followups` (read), `create_followup`, `update_followup`, `complete_followup` and `dismiss_followup` (write). The tool description tells the assistant it is for messages already sent, never drafts, and to pass an `idempotencyKey`.
