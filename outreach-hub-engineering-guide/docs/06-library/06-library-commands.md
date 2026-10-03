# Library Commands

Write operations live in `src/modules/library/application/` as one service per command, wired in `create-library-services.ts` and exposed today through MCP (`docs/04-mcp/01-mcp-tools.md`). Web API routes and UI forms will call the same services; they are not built yet and need their own CSRF-safe mutation design first.

Every command takes the verified actor first, validates with one strict Zod schema (`domain/document-commands.schema.ts`, `domain/folder-commands.schema.ts`, unknown fields rejected), and writes an audit event.

| Command | Behavior |
| --- | --- |
| `createTextDocument` | Markdown or plain text (max 100,000 bytes). Stores bytes in private Blob, then commits document, version 1, search text, tags and audit together. **Idempotent**: same title (case-insensitive) and identical content returns the existing document. |
| `addTextDocumentVersion` | Next version of a text document, same filename, optional change note. Identical content is not stored twice. Non-text documents are refused. |
| `updateDocument` | Partial edit of title, description, category, folder. Omitted means unchanged; `null` clears the description or unfiles. Only real differences are written and audited. |
| `setDocumentTags` | Replaces the tag set (max 10, case-insensitive). Reports the names as stored, which keep the first spelling used. |
| `archiveDocument` / `restoreDocument` | Reversible removal from normal views. Idempotent. Restoring into a folder archived meanwhile returns the document to Unfiled. |
| `linkDocument` / `unlinkDocument` | Link to a person, organization, prospect, route or campaign with a relation, optionally pinned to a version. An identical link is returned unchanged. Unlinking removes the relationship only. |
| `createFolder` / `renameFolder` / `archiveFolder` | Max four levels, unique sibling names, archive only when empty. Creating an existing folder returns it. |
| `getDocumentText` (read) | Bounded extracted text of the current version. Untrusted content. |

## Rules that hold for every command

- **No hard delete.** "Delete" means archive. Nothing removes documents, versions or blobs.
- **Atomic audit.** Each repository command is one `database.batch`, so the mutation and its audit event commit together or not at all. No-op calls write nothing and report `auditEventId: null`.
- **Blob vs database.** They cannot share a transaction, so bytes are written first and deleted again if the commit fails. If cleanup also fails the original error surfaces and the orphan is found by the blob manifest check.
- **Server-generated keys.** Blob keys are `documents/{documentId}/{versionId}`; clients never choose storage locations.
- **Owner as creator.** `created_by` references `users`, so the owner's row is created on first use from `OWNER_EMAIL` (`shared/auth/owner-user.repository.ts`).
- **Content stays out of audit rows.** Audit metadata holds ids, counts, sizes and checksums, never bodies or descriptions.
- **Expected failures** are `LibraryCommandError` (`not_found`, `conflict`, `unsupported`, `limit_exceeded`); adapters map the code to their protocol.

## Not built yet

Binary uploads (PDF, DOCX, images) via direct-to-Blob client upload, folder move, text extraction for binary types, and the web API and UI for these commands.
