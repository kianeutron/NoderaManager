# Routes and Campaigns UI

Route `/routes` (sidenav: Routes & campaigns). Two tabs, **Routes** and **Campaigns**, in the same `PreviewLayout` pattern as People and Outreach. Commands and rules: `11-operations/07-people-prospect-commands.md`.

## Structure

`RoutesAndCampaignsPage` owns the tabs and the URL; each tab is a view in its own module (`modules/routes/ui`, `modules/campaigns/ui`) that receives plain props.

- **URL is the state:** `?view=routes|campaigns&q=&status=&scope=&id=` (`strategy-url-state.ts`, per-parameter fallback, defaults omitted). `use-strategy-workspace.ts` is the only place transitions are built.
- **Data:** `routes-api.ts` / `campaigns-api.ts` (typed Hono client, `ApiRequestError`), `use-route-queries.ts` / `use-campaign-queries.ts` (key roots `routeKeys`, `campaignKeys`), `use-route-mutations.ts` / `use-campaign-mutations.ts`. Every mutation invalidates the key root of its module, and a campaign membership change also invalidates what shows membership.

## Routes tab

A short list with no paging: each row shows modules (archived ones not counted) and what the route produced. The preview shows the route's description, live results (prospects with how many are open, won, messages sent, replies), and each module with its own results. Actions: edit, add module, edit or archive a module, archive the route. **Archiving a route moves the view to the archived scope** so the preview does not go blank; an archived route is read-only with a Restore button. Results are computed live from prospects and messages.

## Campaigns tab

Filters: status, Show (Active, Archived) and search. Rows show status, window, and live counts. The preview shows status, goal, dates, routes, targeting rules, results and members.

- **Lifecycle buttons** (`CampaignStatusActions`) offer only valid moves from the current status (`campaignNextSteps`); **Complete** asks first because it is final.
- **Members:** `CampaignMembersSection` lists linked prospects (keyset, "Load more"), each with a one-click **Take out** (it only removes the link and can be added back). **Add prospects** (`AddProspectsDialog`) lists suggestions, marks the ones that fit the targeting rules, and cannot add until something is ticked.
- **Targeting rules suggest, never decide.** Nothing is added automatically.
- **Form** (`CampaignForm`): name, goal, dates (`datetime-local`, converted to ISO instants), routes (multi-select; a key is `routeId` or `routeId:moduleId`) and rules (`MultiSelectField`). Editing sends only the changes; fields and routes are saved in sequence.
- Completed and archived campaigns are read-only.

## Errors

Every failure is worded from `shared/api/error-copy.ts` (`route_name_taken`, `campaign_needs_route`, `campaign_transition_invalid`, `campaign_finished`, `campaign_running`, `prospect_outside_campaign_routes`, `campaign_window_invalid`, and others). The form keeps what was typed.
