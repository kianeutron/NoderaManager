"use client";

import { DocumentCardList, DocumentCardListSkeleton } from "@/modules/library/ui/DocumentCardList";
import { LibrarySection } from "@/modules/library/ui/LibrarySection";
import { useRecentDocuments } from "@/modules/library/ui/use-library-queries";

type RecentDocumentsProps = Readonly<{ selectedId: string | null; onSelect: (documentId: string) => void }>;

/** A quick shelf of the latest changes. Renders nothing when it has nothing to show, so failures never block the main list. */
export function RecentDocuments({ selectedId, onSelect }: RecentDocumentsProps) {
  const query = useRecentDocuments();
  if (query.isError || (query.isSuccess && query.data.items.length === 0)) return null;

  return (
    <LibrarySection title="Recently updated">
      {query.isSuccess
        ? <DocumentCardList documents={query.data.items} label="Recently updated documents" layout="shelf" onSelect={onSelect} selectedId={selectedId} />
        : <DocumentCardListSkeleton count={6} layout="shelf" />}
    </LibrarySection>
  );
}
