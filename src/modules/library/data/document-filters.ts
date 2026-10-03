import { and, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import type { LibraryFilters } from "@/modules/library/domain/document.schema";
import { escapeLikePattern } from "@/shared/db/escape-like";
import { documents, documentSearchText, tagLinks, tags } from "@/shared/db/schema/library";

function hasTag(tagId: string): SQL {
  return sql`exists (select 1 from ${tagLinks} where ${tagLinks.documentId} = ${documents.id} and ${tagLinks.tagId} = ${tagId})`;
}

// Only the current version's text is searchable; older versions must not surface stale matches.
function matchesSearchTerm(term: string): SQL {
  const pattern = `%${escapeLikePattern(term)}%`;

  return or(
    ilike(documents.title, pattern),
    ilike(documents.description, pattern),
    sql`exists (select 1 from ${tagLinks} inner join ${tags} on ${tags.id} = ${tagLinks.tagId} where ${tagLinks.documentId} = ${documents.id} and ${tags.name} ilike ${pattern})`,
    sql`exists (select 1 from ${documentSearchText} where ${documentSearchText.documentVersionId} = ${documents.currentVersionId} and ${documentSearchText.searchVector} @@ plainto_tsquery('simple', ${term}))`
  ) ?? sql`false`;
}

export function buildDocumentConditions(filters: LibraryFilters): SQL | undefined {
  const conditions: SQL[] = [isNull(documents.archivedAt)];

  if (filters.category) conditions.push(eq(documents.category, filters.category));
  if (filters.folderId) conditions.push(eq(documents.folderId, filters.folderId));
  if (filters.tagId) conditions.push(hasTag(filters.tagId));
  if (filters.q) conditions.push(matchesSearchTerm(filters.q));

  return and(...conditions);
}
