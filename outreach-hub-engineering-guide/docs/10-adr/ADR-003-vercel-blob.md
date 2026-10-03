    # ADR-003: Private Vercel Blob for Library Files

    **Status:** Accepted for V1

Use Vercel Blob private storage for file bytes.

Reasons:

- same platform as app;
- Hobby included capacity suitable for initial private library;
- direct client upload can reduce function transfer;
- clear separation between relational metadata and binary bytes.

Constraints:

- private storage only for personal documents;
- no permanent public URLs;
- database stores logical metadata/version links;
- storage adapter isolates Vercel-specific APIs;
- enforce app limits below provider quota.

