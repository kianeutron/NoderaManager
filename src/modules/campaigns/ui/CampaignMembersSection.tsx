"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import { Alert, Box, Button, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { useState } from "react";
import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";
import { AddProspectsDialog } from "@/modules/campaigns/ui/AddProspectsDialog";
import { useRemoveCampaignProspects } from "@/modules/campaigns/ui/use-campaign-mutations";
import { useCampaignMembers } from "@/modules/campaigns/ui/use-campaign-queries";
import { ProspectStatusChip } from "@/modules/prospects/ui/ProspectStatusChip";
import { describeError } from "@/shared/api/error-copy";
import { formatDate } from "@/shared/lib/format-date";
import { mergeKeysetPages } from "@/shared/lib/merge-keyset-pages";
import { PreviewSection } from "@/shared/ui/PreviewSection";

type CampaignMembersSectionProps = Readonly<{ campaignId: string; status: CampaignStatus; isArchived: boolean }>;

/** A campaign's prospects, with the ways to add and to take out. Taking one out only removes the link: the prospect stays. */
export function CampaignMembersSection({ campaignId, status, isArchived }: CampaignMembersSectionProps) {
  const query = useCampaignMembers(campaignId);
  const remove = useRemoveCampaignProspects();
  const [adding, setAdding] = useState(false);
  const canChange = status !== "completed" && !isArchived;
  const { items, total } = query.data ? mergeKeysetPages(query.data.pages) : { items: [], total: null };

  return (
    <PreviewSection title={total === null ? "Prospects" : `Prospects (${total})`}>
      <Stack sx={{ gap: 1.25 }}>
        {query.isPending ? <Skeleton aria-label="Loading prospects" height={56} variant="rounded" /> : null}
        {query.isError ? <Alert role="alert" severity="error">{describeError(query.error, "campaign")}</Alert> : null}
        {remove.error ? <Alert severity="error">{describeError(remove.error, "campaign")}</Alert> : null}
        {query.data && items.length === 0 ? <Typography color="text.secondary" variant="body2">No prospects in this campaign yet.</Typography> : null}
        {items.map((member) => {
          const name = [member.person?.fullName, member.organization?.name].filter(Boolean).join(" · ") || "Unnamed prospect";
          return (
            <Stack direction="row" key={member.prospectId} sx={{ alignItems: "center", gap: 0.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ overflowWrap: "anywhere" }} variant="body2">{name}</Typography>
                <Typography color="text.secondary" variant="caption">{[member.routeName, member.moduleName].filter(Boolean).join(" · ")} · {member.lastContactedAt ? `Contacted ${formatDate(member.lastContactedAt)}` : "Not contacted"}</Typography>
              </Box>
              <ProspectStatusChip status={member.status} />
              {canChange ? <IconButton aria-label={`Take ${name} out of the campaign`} disabled={remove.isPending} onClick={() => void remove.mutateAsync({ campaignId, prospectIds: [member.prospectId] }).catch(() => undefined)} size="small"><LinkOffRounded fontSize="small" /></IconButton> : null}
            </Stack>
          );
        })}
        {query.hasNextPage ? <Button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} sx={{ alignSelf: "flex-start" }}>{query.isFetchingNextPage ? "Loading…" : "Show more"}</Button> : null}
        {canChange ? <Button onClick={() => setAdding(true)} startIcon={<AddRounded />} sx={{ alignSelf: "flex-start" }}>Add prospects</Button> : null}
      </Stack>
      {adding ? <AddProspectsDialog campaignId={campaignId} onClose={() => setAdding(false)} /> : null}
    </PreviewSection>
  );
}
