"use client";

import EditRounded from "@mui/icons-material/EditRounded";
import LanguageRounded from "@mui/icons-material/LanguageRounded";
import LinkedIn from "@mui/icons-material/LinkedIn";
import PeopleAltRounded from "@mui/icons-material/PeopleAltRounded";
import { Button, Stack } from "@mui/material";
import { useState } from "react";
import { ArchiveAction } from "@/shared/ui/ArchiveAction";
import { OrganizationFormDialog } from "@/modules/organizations/ui/OrganizationFormDialog";
import { OrganizationPreview } from "@/modules/organizations/ui/OrganizationPreview";
import { useSetOrganizationArchived } from "@/modules/organizations/ui/use-organization-mutations";
import { useOrganization } from "@/modules/organizations/ui/use-organization-queries";
import { PreviewFrame } from "@/shared/ui/PreviewFrame";
import { PreviewQueryBoundary } from "@/shared/ui/PreviewQueryBoundary";

type OrganizationPreviewPanelProps = Readonly<{ organizationId: string; onClose: () => void; onOpenPerson: (personId: string) => void; onShowPeople: (organizationId: string) => void }>;

export function OrganizationPreviewPanel({ organizationId, onClose, onOpenPerson, onShowPeople }: OrganizationPreviewPanelProps) {
  const query = useOrganization(organizationId);
  const archiver = useSetOrganizationArchived();
  const [editing, setEditing] = useState(false);

  return (
    <PreviewQueryBoundary noun="company" onClose={onClose} query={query}>
      {(organization) => (
        <>
        <PreviewFrame
          footer={(
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
              {organization.people.length > 0 ? <Button onClick={() => onShowPeople(organization.id)} startIcon={<PeopleAltRounded />} variant="contained">View people</Button> : null}
              {organization.websiteUrl ? <Button href={organization.websiteUrl} rel="noopener noreferrer" startIcon={<LanguageRounded />} target="_blank" variant="outlined">Website</Button> : null}
              {organization.linkedinUrl ? <Button href={organization.linkedinUrl} rel="noopener noreferrer" startIcon={<LinkedIn />} target="_blank" variant="outlined">LinkedIn</Button> : null}
              {organization.archivedAt ? null : <Button onClick={() => setEditing(true)} startIcon={<EditRounded />} variant="outlined">Edit</Button>}
              <ArchiveAction archived={organization.archivedAt !== null} error={archiver.error} name={organization.name} noun="company" onChange={(archive) => archiver.mutateAsync({ organizationId: organization.id, archive })} pending={archiver.isPending} />
            </Stack>
          )}
          onClose={onClose}
        >
          <OrganizationPreview onOpenPerson={onOpenPerson} organization={organization} />
        </PreviewFrame>
        {editing ? <OrganizationFormDialog onClose={() => setEditing(false)} onSaved={() => setEditing(false)} organization={organization} /> : null}
        </>
      )}
    </PreviewQueryBoundary>
  );
}
