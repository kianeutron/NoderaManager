    # Analytics Definitions

    Metrics must have exact definitions.

- **Unique prospects**: distinct prospect IDs, not message count.
- **Contacts reached**: prospects with at least one sent outreach.
- **Delivered**: sent messages not known bounced/blocked; do not claim delivery if provider lacks confirmation.
- **Reply rate**: prospects with inbound reply / prospects contacted, with time-window rules stated.
- **Positive reply**: normalized response category meeting configured positive threshold.
- **Warm lead**: prospect status warm or deeper.
- **Opportunity**: explicit current project/commercial discussion.
- **Bounce rate**: known bounces / email sends.

Every dashboard percentage should allow viewing raw numerator/denominator.

Do not compare routes with tiny sample sizes without displaying sample size.

## As implemented on the Overview

One read, `getOverview` (`modules/analytics`), feeds the page, `GET /api/analytics/overview?range=7d|30d|90d` and the MCP tool `get_overview`, so they cannot disagree. Days are **UTC calendar days**; the window is the last N days including today, compared with the N days before it.

| Figure | Counted as |
| --- | --- |
| Messages sent | `outreach_messages` by `sent_at` day. |
| Prospects reached | Distinct prospects with a message sent in the window. |
| Replies received | Inbound `interactions` of type `reply` by `occurred_at` day. Auto-replies are not replies. |
| Reply rate | Prospects reached in the window that have a message with `reply_status = replied`, over prospects reached. Always shown with both numbers; under 10 prospects (or 10 messages for a route) it is labelled a small sample. |
| Pipeline | Non-archived prospects by current status. A snapshot, not a conversion funnel. |
| Reply depth | Each prospect once, at the deepest `response_depth` of any classified reply, all time. |
| Waiting on a reply | Open prospects whose newest message (3 to 30 days old) has no reply and did not bounce. |
| Routes, campaigns, follow-ups | Taken from the routes, campaigns and follow-ups services, never recounted. Routes are all time; campaigns are the active ones. |
| Rhythm calendar | Messages per UTC day for the last 26 weeks, whatever the window. |

### Analytics page (`getInsights`, `getBreakdown`)

Windows are 7, 30, 90, 180 or 365 UTC days, compared with the window before. Up to 90 days the trend has a point per day; beyond that, per week (weeks start Monday, UTC).

| Figure | Counted as |
| --- | --- |
| Bounce rate | Email bounces over emails sent in the window. Only email can bounce, so other channels stay out of the denominator. |
| Funnel | Cohort: prospects with a message in the window. Replied: a message of theirs has `reply_status = replied`. Engaged, call, commercial: replied **and** the deepest classified reply is depth 3 (qualification question), 6 (call or interview) or 8 (proposal or commercial step). Each step is a subset of the one before. Depth is only known if you classified the reply, so these steps undercount until you do. **Won** is the cohort's prospects whose status is `won`, shown apart because it is an outcome, not a further step. |
| Reply time | For messages sent in the window with a real reply tied to them: first reply time minus send time (a reply logged before the send counts as 0). Median, plus how many fell within an hour, a day, 3 days, a week, or later. |
| Best time to send | Messages and answered messages per ISO weekday and UTC hour. A reply rate is only shaded where a cell has at least 3 messages; "best answered" lists up to three such cells. |
| Deliverability | Confirmed delivered (provider-reported), failed, and everything else as unconfirmed; bounces by kind. |
| Breakdown | Messages in the window grouped by one dimension: route, module, persona, country (the person's, else their company's), company type, channel, campaign or prospect source. Per group: messages sent, distinct prospects reached, distinct prospects replied, messages replied, bounces. Biggest group first, at most 50 groups, with the total group count. A group whose dimension is not recorded has a null key. Rates are replied over reached; groups under 10 prospects are flagged a small sample. |

Unlike the overview's route list (all time), the breakdown is for the chosen window.

