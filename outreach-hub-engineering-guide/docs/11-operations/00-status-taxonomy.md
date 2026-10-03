    # Prospect Status and Response Depth

    Use controlled values, not arbitrary strings.

Suggested prospect lifecycle:

`researched -> ready -> contacted -> replied -> warm -> opportunity -> proposal -> won | lost | dormant | disqualified`

Do not force every contact through every state.

Suggested response depth:

1. acknowledgement;
2. evaluated/portfolio viewed;
3. qualification question;
4. asks CV/rate/availability;
5. referral/introduction;
6. call/interview;
7. active project discussion;
8. proposal/commercial step;
9. paid work.

Store structural reason separately (`language`, `local_payroll`, `residency`, `clearance`, etc.) from timing status.

## Stored values

Source of truth: `src/shared/db/schema/crm-values.ts` (the database enums are built from it).

- **Prospect status**: `researched`, `ready`, `contacted`, `replied`, `warm`, `opportunity`, `proposal`, `won`, `lost`, `dormant`, `disqualified`. Earlier development values map as `researching -> researched`, `engaged -> replied`, `paused -> dormant`, `closed -> lost`.
- **Temperature** (optional): `cold`, `warm`, `hot`. It is a judgement about warmth, separate from status.
- **Structural reason** (optional): `language`, `local_payroll`, `residency`, `clearance`, `compliance`, `other`. Stored on the prospect, never folded into status. A timing no is `dormant` plus a follow-up with `not_before_at` (the status dialog offers that follow-up when going dormant; see `07-people-prospect-commands.md`).
- **Response depth** is stored as the 1-based position in `responseDepthLabels`, so "depth 5 or deeper" is a number comparison: 1 acknowledgement, 2 evaluated/portfolio viewed, 3 qualification question, 4 asks CV/rate/availability, 5 referral/introduction, 6 call/interview, 7 active project discussion, 8 proposal/commercial step, 9 paid work. It lives on interactions and is set by explicit classification, never inferred.
- **Channels** are `email`, `linkedin`, `inmail`, `other`. Referral and community are routes, not channels.
- **Delivery**: `sent` (default, unconfirmed), `delivered` (provider-confirmed), `failed`. **Bounce**: `none`, `soft`, `hard`, `blocked`. **Reply**: `none`, `replied`, `auto_reply`.

