"use client";

import EditRounded from "@mui/icons-material/EditRounded";
import { Button, Stack } from "@mui/material";
import { useState } from "react";
import { CampaignForm } from "@/modules/campaigns/ui/CampaignForm";
import { CampaignMembersSection } from "@/modules/campaigns/ui/CampaignMembersSection";
import { CampaignPreview } from "@/modules/campaigns/ui/CampaignPreview";
import { CampaignStatusActions } from "@/modules/campaigns/ui/CampaignStatusActions";
import { useSetCampaignArchived } from "@/modules/campaigns/ui/use-campaign-mutations";
import { useCampaign } from "@/modules/campaigns/ui/use-campaign-queries";
import { ArchiveAction } from "@/shared/ui/ArchiveAction";
import { PreviewFrame } from "@/shared/ui/PreviewFrame";
import { PreviewQueryBoundary } from "@/shared/ui/PreviewQueryBoundary";

type CampaignPreviewPanelProps = Readonly<{ campaignId: string; onClose: () => void }>;

/** A campaign's state, its next steps, and its prospects. A completed one is a record and can only be read or archived. */
export function CampaignPreviewPanel({ campaignId, onClose }: CampaignPreviewPanelProps) {
  const query = useCampaign(campaignId);
  const archiver = useSetCampaignArchived();
  const [editing, setEditing] = useState(false);

  return (
    <PreviewQueryBoundary noun="campaign" onClose={onClose} query={query}>
      {(campaign) => {
        const isArchived = campaign.archivedAt !== null;
        return (
          <>
            <PreviewFrame
              footer={(
                <Stack sx={{ gap: 1.5 }}>
                  {isArchived ? null : <CampaignStatusActions campaignId={campaign.id} status={campaign.status} />}
                  <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
                    {isArchived || campaign.status === "completed" ? null : <Button onClick={() => setEditing(true)} startIcon={<EditRounded />} variant="outlined">Edit</Button>}
                    <ArchiveAction archived={isArchived} error={archiver.error} name={campaign.name} noun="campaign" onChange={(archive) => archiver.mutateAsync({ campaignId: campaign.id, archive })} pending={archiver.isPending} />
                  </Stack>
                </Stack>
              )}
              onClose={onClose}
            >
              <Stack sx={{ gap: 3 }}>
                <CampaignPreview campaign={campaign} />
                <CampaignMembersSection campaignId={campaign.id} isArchived={isArchived} status={campaign.status} />
              </Stack>
            </PreviewFrame>
            {editing ? <CampaignForm campaign={campaign} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} /> : null}
          </>
        );
      }}
    </PreviewQueryBoundary>
  );
}
