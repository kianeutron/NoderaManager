import type { KeysetPage } from "@/shared/api/keyset";

/**
 * Merges loaded pages into one list. Keyset paging never repeats a row within one sort order, but a rename under a
 * name sort can move an already-loaded row behind the cursor, so the first occurrence wins and later repeats are dropped.
 */
export function mergeKeysetPages<Item extends Readonly<{ id: string }>>(pages: readonly KeysetPage<Item>[]): Readonly<{ items: readonly Item[]; total: number }> {
  const seen = new Set<string>();
  const items = pages.flatMap((page) => page.items).filter((item) => !seen.has(item.id) && seen.add(item.id));

  return { items, total: pages[0]?.total ?? items.length };
}
