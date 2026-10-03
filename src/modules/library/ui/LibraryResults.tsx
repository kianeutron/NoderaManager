"use client";

import { Box, Button, Typography } from "@mui/material";
import type { LibraryFilters } from "@/modules/library/domain/document.schema";
import { DocumentCardList, DocumentCardListSkeleton } from "@/modules/library/ui/DocumentCardList";
import { mergeDocumentPages } from "@/modules/library/ui/document-pages";
import { hasActiveFilters } from "@/modules/library/ui/library-url-state";
import { useDocumentPages } from "@/modules/library/ui/use-library-queries";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";

type LibraryResultsProps = Readonly<{
  filters: LibraryFilters;
  selectedId: string | null;
  onSelect: (documentId: string) => void;
  onClearFilters: () => void;
}>;

export function LibraryResults({ filters, selectedId, onSelect, onClearFilters }: LibraryResultsProps) {
  const query = useDocumentPages(filters);

  if (query.isPending) return <DocumentCardListSkeleton count={8} layout="grid" />;
  if (query.isError) return <ErrorState description="Your documents are safe. Check your connection and try again." onRetry={() => void query.refetch()} title="Documents could not be loaded" />;

  const { documents, total } = mergeDocumentPages(query.data.pages);

  if (documents.length === 0) {
    return hasActiveFilters(filters)
      ? <EmptyState action={<Button onClick={onClearFilters} variant="outlined">Clear filters</Button>} description="Try a different search or remove a filter." title="No documents match" />
      : <EmptyState description="Documents you upload will appear here, ready to preview and link to your outreach." title="Your library is empty" />;
  }

  return (
    <Box>
      <Typography aria-live="polite" color="text.secondary" sx={{ display: "block", mb: 1.5 }} variant="caption">{total} {total === 1 ? "document" : "documents"}</Typography>
      <Box sx={{ opacity: query.isPlaceholderData ? 0.6 : 1, transition: "opacity 150ms" }}>
        <DocumentCardList documents={documents} label="Documents" layout="grid" onSelect={onSelect} selectedId={selectedId} />
      </Box>
      {query.hasNextPage ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2.5 }}>
          <Button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} variant="outlined">{query.isFetchingNextPage ? "Loading…" : "Show more"}</Button>
        </Box>
      ) : null}
    </Box>
  );
}
