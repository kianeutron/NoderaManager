"use client";

import { keepPreviousData, useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { shouldRetryRequest } from "@/shared/api/api-request-error";
import type { KeysetPage } from "@/shared/api/keyset";

// The first page has no cursor; every later page continues from the previous page's `nextCursor`.
const firstPage: string | null = null;

type KeysetListOptions<Item> = Readonly<{
  /** Must include every filter, so a change starts a fresh list. */
  queryKey: readonly unknown[];
  fetchPage: (cursor: string | undefined) => Promise<KeysetPage<Item>>;
}>;

/** An infinite, cursor-paged list. The previous results stay visible while a new filter loads. */
export function useKeysetList<Item>({ queryKey, fetchPage }: KeysetListOptions<Item>) {
  return useInfiniteQuery<KeysetPage<Item>, Error, InfiniteData<KeysetPage<Item>, string | null>, readonly unknown[], string | null>({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam ?? undefined),
    initialPageParam: firstPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
    retry: shouldRetryRequest
  });
}
