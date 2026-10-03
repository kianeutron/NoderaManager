import CampaignRounded from "@mui/icons-material/CampaignRounded";
import { Chip } from "@mui/material";
import type { CampaignSummary } from "@/modules/campaigns/domain/campaign.types";
import { campaignStatusMeta, describeWindow } from "@/modules/campaigns/ui/campaign-presentation";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { EntityRow } from "@/shared/ui/EntityRow";

type CampaignRowProps = Readonly<{ campaign: CampaignSummary; selected: boolean; onSelect: () => void }>;

const routeLabel = (route: CampaignSummary["routes"][number]) => (route.moduleName ? `${route.routeName} · ${route.moduleName}` : route.routeName);

/** A campaign: its status, dates, routes and what it has produced so far. */
export function CampaignRow({ campaign, selected, onSelect }: CampaignRowProps) {
  const { label, color } = campaignStatusMeta[campaign.status];
  const shownRoutes = campaign.routes.slice(0, 2);
  const hiddenRoutes = campaign.routes.length - shownRoutes.length;

  return (
    <EntityRow
      avatar={<EntityAvatar icon={<CampaignRounded fontSize="small" />} name={campaign.name} />}
      meta={(
        <>
          <Chip color={color} label={label} size="small" sx={{ fontWeight: 700 }} variant="outlined" />
          {shownRoutes.map((route) => <Chip key={`${route.routeId}:${route.moduleId ?? ""}`} label={routeLabel(route)} size="small" variant="outlined" />)}
          {hiddenRoutes > 0 ? <Chip label={`+${hiddenRoutes}`} size="small" variant="outlined" /> : null}
          <Chip label={`${campaign.stats.members} ${campaign.stats.members === 1 ? "prospect" : "prospects"}`} size="small" variant="outlined" />
          {campaign.stats.replies > 0 ? <Chip color="success" label={`${campaign.stats.replies} ${campaign.stats.replies === 1 ? "reply" : "replies"}`} size="small" variant="outlined" /> : null}
        </>
      )}
      onSelect={onSelect}
      selected={selected}
      subtitle={campaign.goal ?? describeWindow(campaign.startsAt, campaign.endsAt)}
      title={campaign.name}
    />
  );
}
