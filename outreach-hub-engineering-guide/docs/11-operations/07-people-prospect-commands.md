# People, Organizations, Prospects, Routes and Notes: Commands

Each module has `domain/` (strict Zod schemas, view types, rules), `data/` (repositories), `application/` (one service per command, plus `create-<module>-services.ts` and a thin server-only `<module>-services.ts`) and `mcp/` (tool registration). Commands take the verified actor first. Every write is one `database.batch`, so the mutation and its audit event commit together.

## People

| Command | Behavior |
| --- | --- |
| `createPerson` | Runs the shared duplicate check first. An exact match (same email or LinkedIn profile) blocks and names the existing person. A strong match (same name and organization or domain) blocks unless `confirmNewIdentity` is true. Weak matches (same name only) are returned as `possibleDuplicates`. First email is primary. |
| `updatePerson` | Only fields that differ are written. `null` clears. A LinkedIn profile owned by someone else is refused. |
| `setPersonLinks` | Replaces the list of extra links (website, GitHub, portfolio, other; at most 10, optional label). Compared by normalized URL (`www.`, scheme, trailing slash, `utm_*` ignored), so the same page written twice counts once and repeating the list is a no-op. The LinkedIn profile has its own field. |
| `archivePerson` / `restorePerson` | Hides a person from lists and searches (`archived_at`); prospects, notes and history stay. Idempotent. An archived person can still be read (to show and restore) but is refused by every edit and by new prospects. `searchPeople` with `scope: archived` lists them. |
| `setPersonEmails` | Replaces the set (first primary). An address another person owns is refused. |
| `markPersonDoNotContact` / `clearPersonDoNotContact` | The owner's explicit safety flag with a reason. A flagged person cannot become a prospect. |
| `searchPeople` / `getPerson` | Search by name, email or LinkedIn; filter by organization, persona, country. Detail adds emails, links, prospects and recent notes. |
| `findDuplicateCandidates` | The one duplicate service every path shares. One candidate per person, ranked exact, strong, weak. |

## Organizations

`archiveOrganization` / `restoreOrganization` behave like the person pair (`scope: archived` to find them). `findSimilarOrganizations` returns companies that already use a name (advisory, archived ones excluded) so a form can ask before creating. `createOrganization` blocks when a **domain** already belongs to an organization (the strongest signal) and only advises on a matching name. `updateOrganization`, `setOrganizationDomains` (first canonical; another organization's domain is refused), `searchOrganizations` (name or domain) and `getOrganization` follow the same rules as people.

## Routes

`createRoute` and `createRouteModule` are idempotent and case-insensitive. `listRoutes` returns active routes with their modules and ids. A prospect's module must belong to its route.

`updateRoute` and `updateRouteModule` change name, description and order (only what differs; an empty description clears it; a name another route or module in the same route already has is refused). `archiveRoute` / `restoreRoute` and `archiveRouteModule` / `restoreRouteModule` hide and bring back; nothing is deleted and existing prospects keep their route. `getRouteOverview` returns routes with their modules and **live** counts (prospects, open prospects, won, messages sent, replies), computed from prospects and messages, never from `campaign_daily_stats`.

## Campaigns

A campaign is a time-boxed push over one or more routes (or modules). Its **targeting rules** (personas, countries, company types) only *suggest* prospects (`suggestCampaignProspects`); membership is always added by hand.

| Command | Behavior |
| --- | --- |
| `createCampaign` | Draft with name, goal, optional start/end, routes and rules. Idempotent by case-insensitive name (an archived campaign's name is refused). Needs at least one route; modules must belong to their route. The end cannot precede the start. |
| `updateCampaign` / `setCampaignRoutes` | Fields and routes change separately, only what differs. Routes cannot be emptied. Refused once completed. |
| `setCampaignStatus` | `draft → active ⇄ paused → completed`. Completed is final and read-only. Activating needs routes. |
| `archiveCampaign` / `restoreCampaign` | The way to retire one; a running (active) campaign cannot be archived. |
| `addCampaignProspects` / `unlinkCampaignProspects` | Link or unlink up to many prospects. A prospect must be on one of the campaign's routes. Idempotent. Unlinking removes only the link, never the prospect. |
| `searchCampaigns` / `getCampaign` / `listCampaignProspects` / `suggestCampaignProspects` | Keyset lists and a detail with live counts (members, messages sent, replies). Suggestions are capped at 200 and exclude current members. |

## Prospects

| Command | Behavior |
| --- | --- |
| `createProspect` | Starts `researched` or `ready`. Idempotent: an open prospect (not won, lost or disqualified) for the same target and route/module is returned. Validates the route/module pair and refuses do-not-contact people. |
| `updateProspect` | Route, module, temperature, source, why-targeted, current trigger, next action. Changing the route without a module clears the module. Qualification text is never copied into audit. |
| `updateProspectStatus` | Any status may follow any other. Disqualifying requires a `structuralReason` (kept apart from timing); every other status clears it. |
| `addSignal` | Evidence that makes contact timely. Idempotent on type and summary. Counts as activity on the prospect. |
| `searchProspects` / `getProspect` | Filter by statuses, route, module, person, organization, temperature, country, text. Detail adds signals and recent notes. |

## Outreach

| Command | Behavior |
| --- | --- |
| `logOutreach` | Records a message already sent. An optional `campaignId` ties it to a campaign, accepted only when the prospect is a member of that **active** campaign. Refused for a do-not-contact person, a closed or archived prospect, or an archived contact. Person, organization and route come from the prospect. In one commit it also updates last-contacted (prospect and person, never backwards) and moves `researched`/`ready` to `contacted`. Idempotent by `idempotencyKey` (24 h) or, without one, identical text to the same prospect on the same channel within 10 minutes. The text is never audited. |
| `searchOutreach` / `getOutreachMessage` | Keyset list (name, full-text words, channel, reply status, prospect) and one message with its prospect. |

## Interactions

| Command | Behavior |
| --- | --- |
| `logInteraction` | Something that already happened after the first message: their reply or auto-reply (inbound), a follow-up message we sent (outbound), a call, a meeting, other. Optionally tied to the message it answers, which must belong to the same prospect. **Their reply** moves a researched, ready or contacted prospect to `replied` and sets the message to `replied` (a real reply beats an auto-reply; an auto-reply never moves the prospect). **Anything we send** follows the outreach rules (never to a do-not-contact person, a closed prospect or an archived contact), counts as contact (last-contacted on the prospect and person, never backwards) and starts a first contact. **Something they sent** is always recorded, even from a person since marked do-not-contact or on a closed prospect; only an archived prospect is out of reach. A reply and a follow-up need text; response depth (1 to 9) applies only to something received and is set by the owner, never inferred. Idempotent like `logOutreach` (key for 24 h, or the same content within 10 minutes). Text is never audited. |
| `logBounce` | Sets the message's bounce state (soft, hard, blocked), marks its delivery failed (the database refuses delivered-with-a-bounce) and records a `bounce_notice` in the prospect's timeline. The same bounce again is a no-op; a soft bounce that turns out hard updates. |
| `listInteractions` | A prospect's timeline, newest first, bounded. |

## Follow-ups

| Command | Behavior |
| --- | --- |
| `createFollowUp` | A task to get back to a prospect: a reason (1 to 500 characters) and optionally `dueAt` (the deadline), `notBeforeAt` (the earliest sensible moment, for "after the summer") and a suggested channel. Both dates are optional and a due date may be in the past. A plan to contact someone follows the rules for contacting them: not for a do-not-contact person, a closed or archived prospect, or an archived contact. An origin message or interaction must belong to the same prospect. Idempotent: an open follow-up on the same prospect with the same reason (ignoring case) is returned instead of adding a second. |
| `updateFollowUp` | Reason, dates or suggested channel of an **active** follow-up; `null` clears a date or the channel. Date order is checked against the stored date when only one is sent. A finished follow-up cannot change. |
| `completeFollowUp` / `dismissFollowUp` | End an active follow-up. Completing stamps the time; dismissing keeps why. Either way the due date is cleared (the database only allows one on an active follow-up). Repeating the same ending is a no-op; completing a dismissed one, or the reverse, is refused. Completing does not log outreach: that is `logOutreach` or `logInteraction`. |
| `searchFollowUps` | Keyset list, active by default, soonest due first with undated last, or most recent first for finished ones. Filters: status, prospect, and a due bucket (`overdue`, `next_7_days`, `later`, `no_date`), which never depends on a timezone. `getFollowUpSummary` counts active follow-ups per bucket. |

A timing-only "no" is `dormant` plus a follow-up: the status dialog offers a follow-up date when going dormant and runs the two commands in turn. Reasons and dismissal text stay out of the audit trail.

The shared pieces: `shared/idempotency/` (lookup, recording in the same batch, fingerprint) and `findProspectContact` on the prospect repository (the prospect with its contacts, read once for the rules).

See `05-frontend/10-outreach-ui.md`.

## Notes

`addNote` links one note to up to five people, organizations or prospects. Idempotent on identical text for the same first record. The text is never copied into the audit trail.

## Web

People, companies, prospects and notes have web routes and forms for everything above except archiving prospects. Routes and campaigns have their own page: `05-frontend/11-routes-campaigns-ui.md`. See also `05-frontend/09-people-ui.md`.

## Not built yet

Provider-confirmed delivery, voiding a wrongly logged message, archiving prospects, campaign daily statistics, merging duplicates, and signals from the web UI.
