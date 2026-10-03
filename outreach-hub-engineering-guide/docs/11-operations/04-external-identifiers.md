    # External IDs and Connector Hygiene

    Store stable external identifiers whenever an external app returns them:

- Gmail message ID;
- Gmail thread ID;
- LinkedIn conversation/message URL/ID if officially available/manual;
- source system name;
- import record ID.

Use a normalized `external_refs` model or strongly typed columns where queries are frequent.

Never use email subject as the only conversation identity.

Never store OAuth access/refresh tokens in ordinary domain tables. Connector credentials belong in provider-managed auth/secrets.

## How it is stored

All external identifiers live in `external_refs` (source, reference type, external id, and exactly one target record). A `message_id` resolves to exactly one record per source, which is what makes logging sent mail idempotent. A `thread_id` may tag every message in the thread, so a reply can be matched to its conversation. Nothing in `outreach_messages` or `interactions` duplicates these ids.

