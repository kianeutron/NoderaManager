# Overview UI

Route `/` (sidenav: Overview). Today's priorities first, then the numbers behind them. Figures and their definitions: `11-operations/02-analytics-definitions.md`.

## Structure

`OverviewPage` (`modules/analytics/ui`) holds the window in the URL (`?range=7d|30d|90d`, default omitted, `overview-url-state.ts`) and one query, `useOverview(range)` (in `use-analytics-queries.ts`, shared with the Analytics page), which re-reads whenever the page opens or regains focus and keeps the previous window on screen while the next loads. Every section receives plain props from that one result; none fetches.

| Section | Answers |
| --- | --- |
| `OverviewHero` | What needs doing today (one sentence from `briefingOf`), the window, and **Log outreach** (the Outreach page's own dialog). A slow gradient drifts behind it; it stops for reduced motion. |
| `KpiStrip` / `KpiTile` | Sent, reached, replies and reply rate, each against the period before, with a sparkline or ring and what the figure is made of. |
| `ActivityChart` | Sent per day with replies drawn over it (Recharts). |
| `AttentionQueue` | "Needs you": overdue follow-ups and unanswered messages, oldest first, each linking to where you act. |
| `PipelineFlow` | Prospects by stage as a river of bars and ribbons (`pipeline-layout.ts` computes the geometry); dormant, lost and disqualified sit apart as ways out. |
| `ActivityCalendar` | Half a year of days, darker where more was sent, with streak, active days and busiest day (`calendar-layout.ts`). |
| `ResponseDepthLadder`, `ChannelMix`, `RouteLeaderboard`, `CampaignPulse` | How deep replies go, where messages went and who answered, which routes work, and the running campaigns. |

Layout is a 12-column grid from `lg` up and one column below; wide graphics (pipeline, calendar) scroll sideways inside their panel instead of shrinking.

## Rules

- **Links are built from the destination pages' own URL codecs** (`overview-links.ts`), so a change there cannot leave a dead link here.
- **Percentages carry their counts.** The reply rate shows "2 of 6 prospects replied" and is labelled a small sample under 10. Routes are flagged the same way.
- **Nothing is invented.** A day without activity is a zero, an empty section says what to do, and a first-ever figure is "New", not a percentage.
- **Colors come from the theme**, via `useChartColors`; nothing here defines a color. Shared pieces live in `src/shared/ui/charts` (see `05-charts-maps-diagrams.md`).
- Time is UTC for every figure; "overdue" and "3 days ago" use one clock per visit.

## API and MCP

`GET /api/analytics/overview?range=` (owner-only, read-only, uncached) and the MCP read tool `get_overview` return the same `Overview` object from `getOverview`. Routes, campaigns and follow-ups come from their own services.
