import { Box, Skeleton } from "@mui/material";
import type { DocumentSummary } from "@/modules/library/domain/document.types";
import { DocumentCard } from "@/modules/library/ui/DocumentCard";

export type DocumentCardListLayout = "grid" | "shelf";

const listStyles = {
  grid: { display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))" },
  shelf: { display: "flex", gap: 2, overflowX: "auto", pb: 1, scrollSnapType: "x proximity" }
} as const;

const itemStyles = {
  grid: {},
  shelf: { flex: "0 0 auto", scrollSnapAlign: "start", width: { xs: 148, sm: 168 } }
} as const;

type DocumentCardListProps = Readonly<{
  label: string;
  layout: DocumentCardListLayout;
  documents: readonly DocumentSummary[];
  selectedId: string | null;
  onSelect: (documentId: string) => void;
}>;

export function DocumentCardList({ label, layout, documents, selectedId, onSelect }: DocumentCardListProps) {
  return (
    // A horizontally scrollable region must be focusable so keyboard users can scroll it.
    <Box aria-label={label} component="ul" role="list" sx={{ listStyle: "none", m: 0, p: 0, ...listStyles[layout] }} {...(layout === "shelf" ? { tabIndex: 0 } : {})}>
      {documents.map((document) => (
        <Box component="li" key={document.id} sx={itemStyles[layout]}>
          <DocumentCard document={document} onSelect={onSelect} selected={document.id === selectedId} />
        </Box>
      ))}
    </Box>
  );
}

type DocumentCardListSkeletonProps = Readonly<{ layout: DocumentCardListLayout; count: number }>;

export function DocumentCardListSkeleton({ layout, count }: DocumentCardListSkeletonProps) {
  return (
    <Box aria-hidden sx={{ ...listStyles[layout], overflow: "hidden" }}>
      {Array.from({ length: count }, (_, index) => (
        <Box key={index} sx={itemStyles[layout]}>
          <Skeleton sx={{ aspectRatio: "3 / 4", height: "auto", transform: "none" }} variant="rounded" />
          <Skeleton sx={{ mt: 1.25 }} width="80%" />
          <Skeleton width="45%" />
        </Box>
      ))}
    </Box>
  );
}
