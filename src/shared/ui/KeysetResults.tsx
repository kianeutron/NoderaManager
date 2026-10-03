"use client";

import { Box, Button, Typography } from "@mui/material";
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { KeysetPage } from "@/shared/api/keyset";
import { mergeKeysetPages } from "@/shared/lib/merge-keyset-pages";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";

type Message = Readonly<{ title: string; description: string }>;

type KeysetResultsProps<Item extends Readonly<{ id: string }>> = Readonly<{
  query: UseInfiniteQueryResult<InfiniteData<KeysetPage<Item>, string | null>, Error>;
  noun: Readonly<{ singular: string; plural: string }>;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  errorMessage: Message;
  emptyFiltered: Message;
  emptyUnfiltered: Message;
  skeleton: ReactNode;
  /** Renders the loaded rows in whatever layout the list wants. */
  children: (items: readonly Item[]) => ReactNode;
}>;

/** Every state of a paged list in one place: loading, error with retry, empty (filtered or not), the rows, and "Show more". */
export function KeysetResults<Item extends Readonly<{ id: string }>>({ query, noun, hasActiveFilters, onClearFilters, errorMessage, emptyFiltered, emptyUnfiltered, skeleton, children }: KeysetResultsProps<Item>) {
  if (query.isPending) return <>{skeleton}</>;
  if (query.isError) return <ErrorState description={errorMessage.description} onRetry={() => void query.refetch()} title={errorMessage.title} />;

  const { items, total } = mergeKeysetPages(query.data.pages);

  if (items.length === 0) {
    return hasActiveFilters
      ? <EmptyState action={<Button onClick={onClearFilters} variant="outlined">Clear filters</Button>} description={emptyFiltered.description} title={emptyFiltered.title} />
      : <EmptyState description={emptyUnfiltered.description} title={emptyUnfiltered.title} />;
  }

  return (
    <Box>
      <Typography aria-live="polite" color="text.secondary" sx={{ display: "block", mb: 1.5 }} variant="caption">{total} {total === 1 ? noun.singular : noun.plural}</Typography>
      <Box sx={{ opacity: query.isPlaceholderData ? 0.6 : 1, transition: "opacity 150ms" }}>{children(items)}</Box>
      {query.hasNextPage ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2.5 }}>
          <Button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} variant="outlined">{query.isFetchingNextPage ? "Loading…" : "Show more"}</Button>
        </Box>
      ) : null}
    </Box>
  );
}
