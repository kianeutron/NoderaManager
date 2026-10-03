import { sql, type SQL } from "drizzle-orm";
import type { DocumentSort } from "@/modules/library/domain/document-sort";
import { keysetAfter, keysetOrderBy, keysetSortKey, type KeysetSort } from "@/shared/db/keyset";
import { documents } from "@/shared/db/schema/library";

// Each order matches a partial index in the schema (documents_updated_sort_index, documents_title_sort_index).
const sorts = {
  updated: { expression: sql`${documents.updatedAt}`, direction: "desc", text: sql<string>`${documents.updatedAt}::text`, cast: "timestamptz" },
  title: { expression: sql`lower(${documents.title})`, direction: "asc", text: sql<string>`lower(${documents.title})`, cast: "text" }
} as const satisfies Record<DocumentSort, KeysetSort>;

export const sortKeyExpression = (sort: DocumentSort) => keysetSortKey(sorts[sort]);
export const documentOrderBy = (sort: DocumentSort) => keysetOrderBy(sorts[sort], documents.id);
export const afterCursor = (cursor: Readonly<{ sort: DocumentSort; key: string; id: string }>) => keysetAfter(sorts[cursor.sort], documents.id, cursor);
