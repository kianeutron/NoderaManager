# Library API and File Delivery

Router: `src/modules/library/api/library.routes.ts`, mounted at `/api/library`. Every route requires the dashboard owner (middleware runs before validation, so anonymous callers always see 401) and responds with `Cache-Control: no-store`.

| Method and path | Purpose |
| --- | --- |
| `GET /documents` | Keyset-paginated list. Query: `q`, `category`, `tagId`, `folderId`, `sort` (`updated`, `title`), `limit` (default 24, max 50), `cursor`. Returns `{ items, total, nextCursor }`. `total` is present only on the first page; `nextCursor` is `null` on the last. |
| `GET /documents/:id` | One document with description, folder path, versions and resolved links. 404 when missing or archived. |
| `GET /documents/:id/file` | Streams the current version's bytes. Query: `disposition` (`inline` or `attachment`). |
| `GET /facets` | Category counts, tag counts and the folder tree, for filter controls. Counts cover all active documents. |

Validation uses the shared Zod schemas in `domain/document.schema.ts`; the same filter schema parses the browser URL, the API query and the service input.

## Pagination

Order is `updated_at DESC, id DESC` or `lower(title), id`, each backed by a partial index over active documents (`documents_updated_sort_index`, `documents_title_sort_index`). A cursor encodes the last row's sort value and id and is rejected if it was issued for a different sort. See [pagination rules](../03-api/02-pagination-filtering.md).

## Search

`q` matches, case-insensitively and literally (LIKE wildcards are escaped): title, description, tag names, and the extracted text of the document's **current** version through Postgres full-text search. Older versions never match.

## File delivery rules

- Bytes are read from private Blob on demand by `shared/blob/document-blob-store.ts`. No permanent public URL exists and none is returned.
- `inline` is honored only for PDF, PNG, JPEG, WebP, plain text and markdown. Every other type (DOCX, CSV, anything new) is forced to `attachment`, whatever the caller asks.
- Markdown is served as `text/plain; charset=utf-8` so it can never be interpreted as markup. All file responses carry `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`.
- Filenames in `Content-Disposition` use an ASCII fallback plus RFC 5987 `filename*`, so quotes, control characters and non-ASCII names cannot break the header.
- Reads do not write audit events; mutations will.

## Configuration

Neon Object Storage is the private file provider. The server-only `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, and `NEON_STORAGE_BUCKET` variables must be configured for file delivery. If they are absent, file operations return a generic unavailable error while unrelated routes and MCP tools remain discoverable.
