"use client";

import CloseRounded from "@mui/icons-material/CloseRounded";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { DocumentActions } from "@/modules/library/ui/DocumentActions";
import { DocumentPreview } from "@/modules/library/ui/DocumentPreview";
import { DocumentPreviewSkeleton } from "@/modules/library/ui/DocumentPreviewSkeleton";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { useDocumentDetail } from "@/modules/library/ui/use-library-queries";
import { ErrorState } from "@/shared/ui/ErrorState";

type DocumentPreviewPanelProps = Readonly<{ documentId: string; onClose: () => void }>;

/** Loads one document and frames it with a header and pinned actions. Placement (inline or drawer) is the dock's job. */
export function DocumentPreviewPanel({ documentId, onClose }: DocumentPreviewPanelProps) {
  const query = useDocumentDetail(documentId);
  const isMissing = query.error instanceof ApiRequestError && query.error.status === 404;

  return (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      <Stack direction="row" sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", justifyContent: "space-between", px: 2.5, py: 1 }}>
        <Typography color="primary.light" variant="overline">Preview</Typography>
        <IconButton aria-label="Close preview" edge="end" onClick={onClose}><CloseRounded /></IconButton>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2.5 }}>
        {query.isPending ? <DocumentPreviewSkeleton /> : null}
        {query.isError ? (
          <ErrorState
            description={isMissing ? "It may have been archived or removed." : "Please try again in a moment."}
            title={isMissing ? "This document is not available" : "Preview could not be loaded"}
            {...(isMissing ? {} : { onRetry: () => void query.refetch() })}
          />
        ) : null}
        {query.isSuccess ? <DocumentPreview document={query.data} /> : null}
      </Box>
      {query.isSuccess ? <Box sx={{ borderTop: 1, borderColor: "divider", p: 2.5 }}><DocumentActions document={query.data} /></Box> : null}
    </Stack>
  );
}
