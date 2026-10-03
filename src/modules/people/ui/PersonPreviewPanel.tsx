"use client";

import BlockRounded from "@mui/icons-material/BlockRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import EmailRounded from "@mui/icons-material/EmailRounded";
import LinkedIn from "@mui/icons-material/LinkedIn";
import { Button, Stack } from "@mui/material";
import { useState } from "react";
import { ArchiveAction } from "@/shared/ui/ArchiveAction";
import { DoNotContactDialog } from "@/modules/people/ui/DoNotContactDialog";
import { PersonFormDialog } from "@/modules/people/ui/PersonFormDialog";
import { PersonPreview } from "@/modules/people/ui/PersonPreview";
import { useSetPersonArchived } from "@/modules/people/ui/use-people-mutations";
import { usePerson } from "@/modules/people/ui/use-people-queries";
import { PreviewFrame } from "@/shared/ui/PreviewFrame";
import { PreviewQueryBoundary } from "@/shared/ui/PreviewQueryBoundary";

type PersonPreviewPanelProps = Readonly<{ personId: string; onClose: () => void; onOpenOrganization: (organizationId: string) => void }>;

export function PersonPreviewPanel({ personId, onClose, onOpenOrganization }: PersonPreviewPanelProps) {
  const query = usePerson(personId);
  const archiver = useSetPersonArchived();
  const [dialog, setDialog] = useState<"edit" | "do-not-contact" | null>(null);

  return (
    <PreviewQueryBoundary noun="person" onClose={onClose} query={query}>
      {(person) => {
        const primaryEmail = person.emails.find((email) => email.isPrimary) ?? person.emails[0];
        const isArchived = person.archivedAt !== null;
        const canEmail = primaryEmail !== undefined && !person.doNotContact && !isArchived;
        const closeDialog = () => setDialog(null);

        return (
          <>
            <PreviewFrame
              footer={(
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
                  {canEmail ? <Button href={`mailto:${primaryEmail.email}`} startIcon={<EmailRounded />} variant="contained">Email</Button> : null}
                  {person.linkedinUrl ? <Button href={person.linkedinUrl} rel="noopener noreferrer" startIcon={<LinkedIn />} target="_blank" variant="outlined">LinkedIn</Button> : null}
                  {isArchived ? null : <Button onClick={() => setDialog("edit")} startIcon={<EditRounded />} variant="outlined">Edit</Button>}
                  {isArchived ? null : <Button color={person.doNotContact ? "primary" : "error"} onClick={() => setDialog("do-not-contact")} startIcon={<BlockRounded />}>{person.doNotContact ? "Allow contact" : "Do not contact"}</Button>}
                  <ArchiveAction archived={isArchived} error={archiver.error} name={person.fullName} noun="person" onChange={(archive) => archiver.mutateAsync({ personId: person.id, archive })} pending={archiver.isPending} />
                </Stack>
              )}
              onClose={onClose}
            >
              <PersonPreview onOpenOrganization={onOpenOrganization} person={person} />
            </PreviewFrame>
            {dialog === "edit" ? <PersonFormDialog onClose={closeDialog} onSaved={closeDialog} person={person} /> : null}
            {dialog === "do-not-contact" ? <DoNotContactDialog onClose={closeDialog} person={person} /> : null}
          </>
        );
      }}
    </PreviewQueryBoundary>
  );
}
