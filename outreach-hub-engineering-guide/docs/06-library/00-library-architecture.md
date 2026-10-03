# Document Library Architecture

Use private Vercel Blob for bytes and Postgres for metadata/relationships.

Database is canonical for:

- document identity;
- versions;
- display metadata (title, description, category — see [04-document-metadata.md](04-document-metadata.md));
- folder/tag relationships;
- domain links;
- extraction/index status;
- checksums;
- audit history.

Blob is canonical only for file bytes.

## Lifecycle

Upload and processing state belongs to the **version**, because a document can already be `ready` while a new version is uploading:

- upload: `pending -> uploaded | failed` (`document_versions.upload_status`);
- extraction: `pending -> processing -> ready | failed | skipped` (`document_versions.extraction_status`; `skipped` for images).

A document itself is either active or archived (`documents.archived_at`). `current_version_id` points at the newest uploaded version and is `null` until the first upload completes.

A document can have several immutable versions. Linking a document to a Person/Route/etc. links the logical document, not an ephemeral upload URL.

Never store permanent public URLs for private documents. Generate authorized delivery/download access on demand according to current Vercel Blob private-storage API.
