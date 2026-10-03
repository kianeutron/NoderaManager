    # Product Vision and Scope

    ## Product statement

Outreach Hub is the single source of truth for all client-acquisition work: who was researched, why they were targeted, which route/module produced them, exactly what was sent, how they responded, what should happen next, and what strategic documents support the process.

The product replaces scattered memory across chats, Gmail, LinkedIn, notes, and files with structured, queryable history.

## Primary outcomes

The application must answer reliably:

- Have we already contacted this person?
- Have we contacted someone else at this organization?
- Through which channel and route?
- What exact message was sent?
- What was the response depth?
- Is this a structural rejection, timing-only rejection, warm lead, active opportunity, or unknown?
- Which routes, personas, countries, channels, CTAs, and proof points are producing meaningful conversations?
- Who needs a follow-up now?
- Which routes are under-tested versus saturated?
- Where is the source strategy/research document for a campaign?

## Primary users

Initial release: one owner/operator. Do not build multi-tenant complexity before needed. Every architecture decision should leave a clean path to multiple users later without forcing it into V1.

## Core surfaces

- Overview dashboard.
- Routes and modules.
- People and organizations.
- Prospects and signals.
- Outreach timeline/conversations.
- Campaigns.
- Follow-ups.
- Analytics.
- Geographic map.
- Strategy/relationship diagrams.
- Document library.
- Imports/exports.
- MCP integration status and audit trail.
- Settings/security.

## Product quality bar

A pretty dashboard with unreliable history is a failure. Data quality, deduplication, exact message retention, and auditability are more important than decorative analytics.

