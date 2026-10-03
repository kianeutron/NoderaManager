"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import { Button, IconButton, Stack, Typography } from "@mui/material";
import { useState } from "react";
import type { ProspectStatus } from "@/modules/prospects/domain/prospect.types";
import type { ProspectSubject } from "@/modules/prospects/ui/prospect-form";
import { ProspectEditDialog } from "@/modules/prospects/ui/ProspectEditDialog";
import { ProspectFormDialog } from "@/modules/prospects/ui/ProspectFormDialog";
import { ProspectStatusChip } from "@/modules/prospects/ui/ProspectStatusChip";
import { ProspectStatusDialog } from "@/modules/prospects/ui/ProspectStatusDialog";
import { PreviewSection } from "@/shared/ui/PreviewSection";

export type ProspectRowData = Readonly<{ id: string; status: ProspectStatus; routeName: string; moduleName?: string | null }>;

type ProspectsSectionProps = Readonly<{
  subject: ProspectSubject;
  /** Names the person or company in the "Add prospect" dialog. */
  subjectLabel: string;
  prospects: readonly ProspectRowData[];
  /** When set, adding is not possible and this says why (archived, do not contact). */
  unavailableReason?: string | null;
}>;

type Dialog = { kind: "add" } | { kind: "edit"; prospectId: string } | { kind: "status"; prospectId: string; status: ProspectStatus };

/** A record's prospects with the ways to add one, edit one, or move one to another status. */
export function ProspectsSection({ subject, subjectLabel, prospects, unavailableReason = null }: ProspectsSectionProps) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <PreviewSection title="Prospects">
      <Stack sx={{ gap: 1 }}>
        {prospects.map((prospect) => {
          const name = [prospect.routeName, prospect.moduleName].filter(Boolean).join(" · ");
          return (
            <Stack direction="row" key={prospect.id} sx={{ alignItems: "center", gap: 0.5 }}>
              <Typography sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }} variant="body2">{name}</Typography>
              <ProspectStatusChip status={prospect.status} />
              <IconButton aria-label={`Change status of ${name}`} onClick={() => setDialog({ kind: "status", prospectId: prospect.id, status: prospect.status })} size="small"><SwapHorizRounded fontSize="small" /></IconButton>
              <IconButton aria-label={`Edit ${name}`} onClick={() => setDialog({ kind: "edit", prospectId: prospect.id })} size="small"><EditRounded fontSize="small" /></IconButton>
            </Stack>
          );
        })}
        {prospects.length === 0 ? <Typography color="text.secondary" variant="body2">No prospects yet.</Typography> : null}
        {unavailableReason
          ? <Typography color="text.secondary" variant="caption">{unavailableReason}</Typography>
          : <Button onClick={() => setDialog({ kind: "add" })} startIcon={<AddRounded />} sx={{ alignSelf: "flex-start" }}>Add prospect</Button>}
      </Stack>
      {dialog?.kind === "add" ? <ProspectFormDialog onClose={close} onSaved={close} subject={subject} subjectLabel={subjectLabel} /> : null}
      {dialog?.kind === "edit" ? <ProspectEditDialog onClose={close} prospectId={dialog.prospectId} /> : null}
      {dialog?.kind === "status" ? <ProspectStatusDialog onClose={close} prospectId={dialog.prospectId} status={dialog.status} /> : null}
    </PreviewSection>
  );
}
