    # Pagination, Filtering, and Sorting

    All potentially growing lists must be server paginated.

Use cursor (keyset) pagination for anything that users can scroll while it changes, including the document library and chronological feeds. Offset pagination is acceptable only for small, rarely changing admin tables.

Filter schemas are explicit and typed. Never accept arbitrary column names/order expressions from the client.

Default maximum page size should be bounded, e.g. 50; absolute maximum e.g. 200.

Search endpoints should return compact projections, not full message bodies/documents by default.

The URL query string should represent dashboard filters where that improves shareability/back navigation.

## Keyset rules

- The sort order must be total: end every `ORDER BY` with the unique `id`, so no two rows compare equal.
- The cursor holds the last row's sort value and `id`. Take the sort value as text from the database rather than from a JavaScript `Date`, which truncates timestamps to milliseconds and would skip or repeat rows.
- Compare with a row constructor, `(sort_key, id) < ($1, $2)`, and back each sort with a matching (partial) index so the comparison is an index condition. Verify with `EXPLAIN` when adding a sort.
- Fetch `limit + 1` rows to learn whether another page exists; never count to decide that.
- Count once per filter set (first page only) when the UI shows a total.
- Cursors are opaque, URL-safe and tied to one sort order. Validate them at the boundary and reject a cursor issued for a different sort.
- Clients may still see a row twice if it moves behind the cursor (for example a rename under a title sort), so merge pages by id.

## Shared implementation

Every keyset list uses the same three pieces, so a new list is configuration rather than new mechanism: `createKeysetPagination` and `sliceKeysetPage` (`src/shared/api/keyset.ts`: cursor contract, limits, page shape), `keysetOrderBy` / `keysetAfter` / `keysetSortKey` (`src/shared/db/keyset.ts`: the SQL), and one partial index per sort order. Lists today: documents, people, organizations, prospects.
