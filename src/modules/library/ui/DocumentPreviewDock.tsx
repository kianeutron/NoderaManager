"use client";

import { DocumentPreviewPanel } from "@/modules/library/ui/DocumentPreviewPanel";
import { PreviewDock } from "@/shared/ui/PreviewDock";

type DocumentPreviewDockProps = Readonly<{ documentId: string | null; onClose: () => void }>;

/** Uses the shared push/drawer behavior so document previews match every other record preview. */
export function DocumentPreviewDock({ documentId, onClose }: DocumentPreviewDockProps) {
  return <PreviewDock label="Document preview" onClose={onClose} selectedId={documentId}>{(id) => <DocumentPreviewPanel documentId={id} key={id} onClose={onClose} />}</PreviewDock>;
}
