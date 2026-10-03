# Document Versioning and Domain Linking

A document is logical identity; versions are immutable uploaded revisions.

Fields per version: `version_number` (unique per document, starting at 1), checksum (SHA-256), blob key (unique, generated server-side), original filename, size, MIME, `upload_status`, `extraction_status`, optional `change_note`, `created_at`, `created_by`, `uploaded_at`. A database check guarantees `uploaded_at` is set exactly when `upload_status = 'uploaded'`.

If a new upload has the exact same checksum as an existing version of the same document, do not create unnecessary duplicate bytes/version unless explicitly requested.

Domain links use `document_links`, which has one explicit nullable foreign key per link target (person, organization, prospect, route, campaign) and a check that exactly one is set. This keeps database-enforced integrity for a small stable set of link types. Add a column (and extend the check) when a new target type is needed.

Users can link one document to several routes/campaigns/people without copying it. A link may optionally pin one version. See [04-document-metadata.md](04-document-metadata.md).
