"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Skeleton, Stack } from "@mui/material";
import { ProspectFormDialog } from "@/modules/prospects/ui/ProspectFormDialog";
import { useProspect } from "@/modules/prospects/ui/use-prospect-queries";
import { describeError } from "@/shared/api/error-copy";
import { ErrorState } from "@/shared/ui/ErrorState";

type ProspectEditDialogProps = Readonly<{ prospectId: string; onClose: () => void }>;

/** Loads the full prospect (lists only carry a summary), then hands it to the form. */
export function ProspectEditDialog({ prospectId, onClose }: ProspectEditDialogProps) {
  const query = useProspect(prospectId);

  if (query.data) return <ProspectFormDialog onClose={onClose} onSaved={onClose} prospect={query.data} />;

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open>
      <DialogTitle>Edit prospect</DialogTitle>
      <DialogContent>
        {query.isError
          ? <ErrorState description={describeError(query.error, "prospect")} onRetry={() => void query.refetch()} title="The prospect could not be loaded" />
          : <Stack aria-busy aria-label="Loading prospect" sx={{ gap: 2, pt: 1 }}><Skeleton height={56} variant="rounded" /><Skeleton height={56} variant="rounded" /><Skeleton height={96} variant="rounded" /></Stack>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}
