# Document Metadata, Categories, Tags and Folders

Canonical shape: `src/shared/db/schema/library.ts`. Value lists below are exported from that file (`documentCategoryValues`, etc.); never repeat them as raw strings elsewhere.

## Document fields

| Field | Rule |
| --- | --- |
| `title` | Required, 1–200 chars. Defaults to the filename without extension in the upload form. |
| `description` | Optional, max 2000 chars. |
| `category` | Required, fixed enum, default `other`. |
| `folder_id` | Optional. `null` means Unfiled. |
| `current_version_id` | Points at the newest `uploaded` version. `null` until the first upload completes. |
| `created_by` | The user who created the document. |
| `archived_at` | Set to hide from normal views. Documents are never hard-deleted. |

## Categories

A fixed enum, not free text, so filters, MCP tools and analytics stay predictable:

`proposal`, `contract`, `pitch_deck`, `case_study`, `one_pager`, `portfolio`, `research`, `template`, `report`, `other`.

Adding a category is a forward-only migration (`ALTER TYPE ... ADD VALUE`) plus a UI label. Categories answer "what kind of document is this"; tags answer everything else.

## Tags

- Free-form, created on the fly while tagging.
- Stored trimmed with whitespace collapsed; `normalized_name` is the lowercased form and is unique, so "Q3 Deck" and "q3  deck" are the same tag.
- 1–40 chars per tag. At most 10 tags per document (service rule, not a DB constraint).
- `tag_links` uses one nullable foreign key per taggable entity (document, person, organization, prospect) with a check that exactly one is set. This keeps referential integrity. Add a column when another entity becomes taggable.
- Tags are removed from an entity by deleting the link. Unused tags are cleaned up by a maintenance job, never by cascade.

## Folders

- Single hierarchy; a document sits in at most one folder.
- Maximum four levels: `depth` 0 (root) to 3. The service computes `depth = parent.depth + 1` and rejects creation beyond `maxFolderDepth`. The DB checks the range and that roots have depth 0.
- Names are 1–80 chars and unique among siblings, compared on `normalized_name` (roots are unique among roots).
- Moving a folder re-computes depth for its whole subtree in one transaction and rejects the move if any descendant would exceed the maximum.
- Folders are archived with `archived_at`, never deleted. A folder with active documents or child folders cannot be archived.

## Upload form

Fields shown when uploading a new document:

1. File (required): allowlisted type, size limit below.
2. Title (required, prefilled from filename).
3. Category (required, default `other`).
4. Folder (optional).
5. Tags (optional, up to 10).
6. Description (optional).
7. Links (optional): people, organizations, prospects, routes or campaigns, each with a relation (`reference`, `sent`, `received`).

Uploading a new version of an existing document asks only for the file and an optional change note (max 500 chars). Title, category, folder and tags are edited separately.

Size limit: 25 MB per file initially. It lives in one server config constant, not in the database, so it can change without a migration.

## Links

`document_links` connects a logical document to a person, organization, prospect, route or campaign. Exactly one target per row (enforced by a check constraint). A link can optionally pin a specific `document_version_id`, for example "the version I sent to this prospect". The same document can be linked to many entities; the same document/target/relation combination is unique.

## Search

Searchable text is assembled at query time from `documents.title`, tag names and `document_search_text.extracted_text`. Full-text search uses the `simple` configuration (no language-specific stemming) so mixed-language documents work. Title search also uses a trigram index (`pg_trgm`) for partial and typo-tolerant matches.
