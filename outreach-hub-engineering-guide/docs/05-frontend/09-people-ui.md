# People & Companies UI

Route `/people` (sidenav: People & companies). Browse, search, filter and preview, plus the manual flows: add and edit a person or company, and mark or lift do-not-contact. Everything calls the same services as the MCP tools (`11-operations/07-people-prospect-commands.md`), so rules, duplicate checks and audit events are identical.

## Structure

One page, two lists. `PeopleAndCompaniesPage` shows tabs (People | Companies), a search field, a filter bar and the results, plus one `PreviewDock` for the selected record.

- **URL is the state.** `?view=people|companies&q=&sort=&persona=&organizationId=&type=&id=`. Parsed by `people-workspace-url-state.ts` with a per-parameter fallback and defaults omitted when serialized. Moving between the lists resets filters; "View people" on a company sets `organizationId`; opening a person from a company (or the reverse) switches view and selection in one navigation. `usePeopleWorkspace` is the only place that builds these transitions.
- **Data.** Typed Hono clients (`people-api.ts`, `organizations-api.ts`) throw `ApiRequestError`; `use-people-queries.ts` and `use-organization-queries.ts` hold key factories and hooks on top of the shared `useKeysetList` (cursor paging, previous results kept while filtering, no retry on 4xx).
- **API.** Reads: `GET /api/people`, `GET /api/people/:id`, `GET /api/organizations`, `GET /api/organizations/:id`. Writes: `POST /api/people`, `PATCH /api/people/:id`, `PUT /api/people/:id/emails`, `PUT|DELETE /api/people/:id/do-not-contact`, `POST /api/people/duplicate-check` (read-only despite the verb), `POST /api/organizations`, `PATCH /api/organizations/:id`, `PUT /api/organizations/:id/domains`. All owner-only through `ownerOnly`, which also hands handlers the verified actor; a missing record is `404 {code:"NOT_FOUND"}`, a rule violation `409` with a readable `message`. There is no delete: archiving is not built yet.
- **Shared building blocks** (also intended for the Library, which still has its own copies): `SearchField`, `FilterSelect`, `SectionPanel`, `EntityAvatar`, `EntityRow`, `EntityList`, `KeysetResults`, `PreviewDock`, `PreviewFrame`, `PreviewSection`/`FactList`, `PreviewQueryBoundary`.

## Behavior rules

- A person marked do-not-contact shows an alert and a chip, and the preview hides the Email action.
- Prospect status is always written out (`ProspectStatusChip`), never color only.
- External links (LinkedIn, website) use `rel="noopener noreferrer"`; emails are `mailto:`.
- Wide screens keep the preview beside the list; below `xl` it is a drawer. `PreviewLayout` puts the preview column beside the *whole* page (header included) so the sticky `PreviewDock` is viewport-height from the first paint. The dock is a flex column capped at the viewport, and `PreviewFrame` owns the scrolling: its header (Preview, close) and footer stay pinned while only the body scrolls. Do not add `overflow` to the dock itself.

## Manual flows

- **CSRF.** Every state-changing `/api` request must carry an `Origin` equal to the site's own (`sameOriginOnly`, applied once to the whole API in `app/api/[[...route]]/route.ts`), on top of the SameSite session cookie. A missing or foreign origin is `403`.
- **Validation is the command schema.** Forms validate with the server's own Zod schema through `commandResolver` (`shared/ui/form`), so a rule exists once. Form values map to command input in `person-form.ts` / `organization-form.ts` (pure, tested). Edits send only changed fields (`null` clears); the schemas' "something must change" rule stays on the API, the Save button is disabled until the form is dirty.
- **Edits are several commands.** Fields and emails (or domains) are separate commands, run in turn and skipped when unchanged. Queries are invalidated even after a failure, because an edit can be partly applied.
- **Duplicates.** Adding a person runs the duplicate check first (skipped when there is no email, LinkedIn or company to compare on). An exact match blocks and offers to open the existing person; a strong match (same name and company) offers "add anyway", which sends `confirmNewIdentity`; weak matches are advisory only. The server repeats the same check, so the UI is a convenience, not the guard.
- **Failure UX.** Entered data survives a failed save; the server's message is shown in the dialog; submit is disabled while a request runs.
- **Do not contact.** Marking asks for a reason (kept in the audit trail); lifting it is a plain confirmation.
- **Not in the UI yet:** signals, archiving prospects, creating routes. The first two need commands that do not exist, the last is an MCP task.

## Archive, notes, prospects, links

- **Archive / restore.** `?scope=archived` (filter "Show") lists archived records. An archived record opens read-only with a notice and a Restore button; Archive asks first (`ArchiveAction`), Restore does not. Nothing is deleted. Prospects and history stay when their person or company is archived.
- **Notes.** `NotesSection` (`modules/notes/ui`) is the one place notes are listed and added, for person and company previews; it refreshes the record it sits in. Notes are append-only.
- **Prospects.** `ProspectsSection` (`modules/prospects/ui`) lists a record's prospects with add, edit and change-status. Route and module come from `GET /api/routes`; changing the route drops the module. The status dialog asks for the structural reason only when disqualifying: the rule lives in `prospectStatusChangeSchema`, shared with the MCP tool. Adding is unavailable, with the reason shown, for an archived or do-not-contact person.
- **Person links.** Rows of type, address and label in the person form; rows left blank are ignored. Creating a person and setting their links are two commands run in turn.
- **Similar companies.** Before a company is created the form checks the name (`POST /api/organizations/similar-check`) and lists who matches with Open and "add anyway". It is advisory and never blocks.
- **API added:** `POST /api/people/:id/archive|restore`, `PUT /api/people/:id/links`, `POST /api/organizations/:id/archive|restore`, `POST /api/organizations/similar-check`, `POST /api/notes`, `GET /api/routes`, `GET|POST /api/prospects`, `PATCH /api/prospects/:id`, `PUT /api/prospects/:id/status`.
