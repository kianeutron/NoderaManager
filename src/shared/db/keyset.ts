import { asc, desc, sql, type AnyColumn, type SQL } from "drizzle-orm";

/**
 * One sort order of a keyset-paginated list. Every order ends in the unique id, which makes it total: no two rows
 * compare equal, so none can be skipped or repeated at a page boundary. Back each order with an index whose
 * columns and direction match `expression` exactly (docs/03-api/02-pagination-filtering.md).
 */
export type KeysetSort = Readonly<{
  expression: SQL;
  direction: "asc" | "desc";
  /** The sort value as text, straight from Postgres so timestamps keep microsecond precision. */
  text: SQL<string>;
  cast: "timestamptz" | "text";
}>;

export function keysetOrderBy(sort: KeysetSort, id: AnyColumn): SQL[] {
  return sort.direction === "asc" ? [asc(sort.expression), asc(id)] : [desc(sort.expression), desc(id)];
}

export function keysetSortKey(sort: KeysetSort): SQL.Aliased<string> {
  return sort.text.as("sort_key");
}

/** Rows strictly after the cursor in the active order. */
export function keysetAfter(sort: KeysetSort, id: AnyColumn, cursor: Readonly<{ key: string; id: string }>): SQL {
  const key = sort.cast === "timestamptz" ? sql`${cursor.key}::timestamptz` : sql`${cursor.key}`;
  return sql`(${sort.expression}, ${id}) ${sql.raw(sort.direction === "asc" ? ">" : "<")} (${key}, ${cursor.id}::uuid)`;
}
