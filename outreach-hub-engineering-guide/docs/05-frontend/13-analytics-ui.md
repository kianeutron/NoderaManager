# Analytics UI

Route `/analytics` (sidenav: Analytics). What is working: one window (`?range=7d|30d|90d|180d|365d`, default 90 days) set against the window before it, and one split (`?by=route|module|persona|country|organizationType|channel|campaign|source`, default route). Both live in the URL (`analytics-url-state.ts`, per-parameter fallback, defaults omitted). Definitions: `11-operations/02-analytics-definitions.md`.

## Structure

`AnalyticsPage` (`modules/analytics/ui`) reads two queries, each re-read on open and on focus: `useInsights(range)` for everything except the split, and `useBreakdown(range, by)` inside `PerformanceBreakdown`, so changing the split never reloads the rest.

| Section | Answers |
| --- | --- |
| `AnalyticsKpis` | Messages, prospects reached, reply rate, bounce rate and median time to reply, each against the period before. Rates are `RateTile`s: a ring, the counts, and a small-sample warning. A bounce rate going up is shown as bad news (`lowerIsBetter`). |
| `ActivityChart` | Sent per day (per week beyond 90 days) with replies drawn over it. The same component as on the overview. |
| `ConversionFunnel` | Where prospects fall away, from messaged to a commercial step, with won apart. |
| `ResponseTimePanel` | How long first replies take. |
| `PerformanceBreakdown` | The split, as a table sortable by sent, reached or reply rate, with each rate beside "n of N replied", thin groups flagged, and "showing the 25 biggest of N" when cut. |
| `SendTimeHeatmap` | Weekday by hour (UTC), shaded by volume or reply rate. |
| `DeliverabilityPanel` | Confirmed, unconfirmed and failed; bounces by kind. |

## Reuse

Everything visual that more than one screen needs lives in `src/shared/ui`: `RangeToggle` (windows and the heatmap's metric), `DashboardGrid`/`GridCell`, and `charts/` (`BarRows`, `HeatCell` with `heat-scale`, `Sparkline`, `RadialGauge`, `DeltaChip`, `AnimatedNumber`). Within the module, `KpiTile`, `RateTile`, `SmallSampleChip`, `DashboardSkeleton` and `ActivityChart` are shared by the overview and this page. Pure layout and wording logic (`funnel-presentation`, `send-time-layout`, `breakdown-presentation`, `calendar-layout`) is kept out of components and unit tested.

## Security and scale

- Owner-only, read-only and uncached. Because each request aggregates a whole window, every analytics read is also counted against `analyticsReadPolicy` (30 a minute); MCP calls fall under the MCP policy.
- Inputs are strict Zod schemas. The split is a closed list mapped to fixed SQL expressions in `performance.repository.ts`; the group list is capped at 50 and the window at 365 days.
- All counting happens in the database, bounded by `sent_at` (`outreach_messages_sent_at_index`). Unused joins are left joins on unique keys, which the planner drops. The reply queries filter `interactions.occurred_at`, which has no index of its own yet: add `(occurred_at)` if interactions grow into the hundreds of thousands.
- A year of data returns about 53 weekly points, at most 168 send-time cells and 50 groups, so payloads stay small.

## API and MCP

`GET /api/analytics/insights?range=`, `GET /api/analytics/breakdown?range=&by=&limit=` and the MCP read tools `get_analytics` and `get_performance_breakdown` return the same objects from `getInsights` and `getBreakdown`. The overview shares the window, activity and channel-breakdown code (`period-window`, `activity.repository`, `performance.repository`), so its numbers match.
