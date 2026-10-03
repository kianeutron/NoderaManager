"use client";

import { Box, Skeleton, Stack } from "@mui/material";
import { CategoryChips } from "@/modules/library/ui/CategoryChips";
import { DocumentPreviewDock } from "@/modules/library/ui/DocumentPreviewDock";
import { LibraryFilterBar } from "@/modules/library/ui/LibraryFilterBar";
import { LibraryResults } from "@/modules/library/ui/LibraryResults";
import { LibrarySearchField } from "@/modules/library/ui/LibrarySearchField";
import { LibrarySection } from "@/modules/library/ui/LibrarySection";
import { RecentDocuments } from "@/modules/library/ui/RecentDocuments";
import { hasActiveFilters } from "@/modules/library/ui/library-url-state";
import { useLibraryFacets } from "@/modules/library/ui/use-library-queries";
import { useQueryClient } from "@tanstack/react-query";
import { UploadDocumentDialog } from "@/modules/library/ui/UploadDocumentDialog";
import { useLibraryUrlState } from "@/modules/library/ui/use-library-url-state";
import { AppShell } from "@/shared/ui/AppShell";
import { PageHeader } from "@/shared/ui/PageHeader";

export function LibraryPage() {
  const { filters, documentId, setFilters, selectDocument, clearFilters } = useLibraryUrlState();
  const facets = useLibraryFacets();
  const queryClient = useQueryClient();

  return (
    <AppShell>
      <Stack sx={{ gap: 3.25 }}>
        <PageHeader actions={<UploadDocumentDialog facets={facets.data} onUploaded={() => void queryClient.invalidateQueries({ queryKey: ["library"] })} />} description="Private files linked to your outreach: proposals, decks, contracts and research." eyebrow="Library" title="Documents" />
        <Box sx={{ alignItems: "start", display: "grid", gap: 2.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: documentId ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)" }, transition: "grid-template-columns 320ms cubic-bezier(.22,1,.36,1)" }}>
          <Stack sx={{ gap: 2.5, minWidth: 0 }}>
            <LibrarySearchField onCommit={(value) => setFilters({ q: value.trim() || undefined }, "replace")} value={filters.q ?? ""} />
            {hasActiveFilters(filters) ? null : <RecentDocuments onSelect={selectDocument} selectedId={documentId} />}
            <LibrarySection title="All documents">
              <Stack sx={{ gap: 2 }}>
                {facets.data ? <CategoryChips facets={facets.data} onChange={(category) => setFilters({ category })} value={filters.category} /> : <Skeleton height={32} variant="rounded" width="60%" />}
                <LibraryFilterBar facets={facets.data} filters={filters} onChange={setFilters} onClear={clearFilters} />
                <LibraryResults filters={filters} onClearFilters={clearFilters} onSelect={selectDocument} selectedId={documentId} />
              </Stack>
            </LibrarySection>
          </Stack>
          <DocumentPreviewDock documentId={documentId} onClose={() => selectDocument(null)} />
        </Box>
      </Stack>
    </AppShell>
  );
}
