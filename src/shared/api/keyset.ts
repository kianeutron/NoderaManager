import { z } from "zod";

export type KeysetCursor<Sort extends string> = Readonly<{ sort: Sort; key: string; id: string }>;

/** Same shape for every list, so a client (or the model) pages every list the same way. */
export type KeysetPage<Item> = Readonly<{
  items: readonly Item[];
  /** Counted once per filter set, so only the first page carries it. */
  total: number | null;
  /** Opaque position of the next page; `null` on the last page. */
  nextCursor: string | null;
}>;

// btoa/atob work in both Node and browsers, unlike Buffer.
function toBase64Url(text: string): string {
  const binary = Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  return new TextDecoder().decode(Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)));
}

type PaginationOptions = Readonly<{ defaultLimit: number; maxLimit?: number }>;

/**
 * The paging contract of one keyset-paginated list: its sort orders, page size, and an opaque cursor.
 * The cursor holds the last row's sort value exactly as the database produced it (full timestamp precision,
 * database-side lowercasing) plus its id as a tiebreaker. It carries no authority: every field is validated
 * and bound as a parameter. See docs/03-api/02-pagination-filtering.md.
 */
export function createKeysetPagination<const Sorts extends readonly [string, ...string[]]>(sorts: Sorts, { defaultLimit, maxLimit = 50 }: PaginationOptions) {
  type Sort = Sorts[number];
  const cursorSchema = z.object({ sort: z.enum(sorts), key: z.string().min(1).max(300), id: z.uuid() });

  const decode = (encoded: string): KeysetCursor<Sort> | null => {
    try {
      const parsed = cursorSchema.safeParse(JSON.parse(fromBase64Url(encoded)));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };

  return {
    pageSize: { default: defaultLimit, max: maxLimit } as const,
    sortSchema: z.enum(sorts),
    limitSchema: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
    /** The wire form is a string; `validateCursor` checks it decodes and matches the sort. */
    cursorSchema: z.string().max(600),
    encode: (cursor: KeysetCursor<Sort>): string => toBase64Url(JSON.stringify(cursor)),
    decode,
    /** For `superRefine` on a list query: rejects a cursor that is malformed or was issued for another sort. */
    validateCursor: (query: { sort: Sort; cursor?: string | undefined }, context: z.core.$RefinementCtx): void => {
      if (query.cursor === undefined) return;
      const cursor = decode(query.cursor);
      if (!cursor) context.addIssue({ code: "custom", path: ["cursor"], message: "Invalid cursor" });
      else if (cursor.sort !== query.sort) context.addIssue({ code: "custom", path: ["cursor"], message: "Cursor was issued for a different sort order" });
    },
    /** For services: the query was validated at the boundary, so a cursor that fails here is an invariant violation. */
    requireCursor: (encoded: string | undefined): KeysetCursor<Sort> | undefined => {
      if (encoded === undefined) return undefined;
      const cursor = decode(encoded);
      if (!cursor) throw new Error("Cursor reached a list service without boundary validation");
      return cursor;
    }
  };
}

/** Repositories fetch one row beyond the page size; its presence is the only signal another page exists. */
export function sliceKeysetPage<Row>(fetchedRows: readonly Row[], limit: number, cursorFor: (lastRow: Row) => string): Readonly<{ rows: Row[]; nextCursor: string | null }> {
  const rows = fetchedRows.slice(0, limit);
  const lastRow = rows.at(-1);
  return { rows, nextCursor: fetchedRows.length > limit && lastRow ? cursorFor(lastRow) : null };
}
