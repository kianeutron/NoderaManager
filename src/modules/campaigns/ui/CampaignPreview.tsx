import CampaignRounded from "@mui/icons-material/CampaignRounded";
import { Box, Chip, Stack, Typography } from "@mui/material";
import type { CampaignDetail } from "@/modules/campaigns/domain/campaign.types";
import { campaignStatusMeta, describeWindow } from "@/modules/campaigns/ui/campaign-presentation";
import { organizationTypeLabel } from "@/modules/organizations/ui/organization-presentation";
import { personaLabel } from "@/modules/people/ui/person-presentation";
import { ArchivedNotice } from "@/shared/ui/ArchivedNotice";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { FactList, PreviewSection } from "@/shared/ui/PreviewSection";

export function CampaignPreview({ campaign }: Readonly<{ campaign: CampaignDetail }>) {
  const { label, color } = campaignStatusMeta[campaign.status];
  const { personas, countries, organizationTypes } = campaign.targetingRules;
  const targeting = [...personas.map((persona) => personaLabel[persona]), ...organizationTypes.map((type) => organizationTypeLabel[type]), ...countries];
  const facts = [
    { term: "Prospects", value: campaign.stats.members },
    { term: "Contacted", value: campaign.stats.contacted },
    { term: "Won", value: campaign.stats.won },
    { term: "Messages sent", value: campaign.stats.messages },
    { term: "Replies", value: campaign.stats.replies }
  ];

  return (
    <Stack sx={{ gap: 3 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
        <EntityAvatar icon={<CampaignRounded />} name={campaign.name} size={56} />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ overflowWrap: "anywhere" }} variant="h6">{campaign.name}</Typography>
          <Chip color={color} label={label} size="small" sx={{ fontWeight: 700, mt: 0.5 }} variant="outlined" />
        </Box>
      </Stack>

      {campaign.archivedAt ? <ArchivedNotice archivedAt={campaign.archivedAt} /> : null}
      {campaign.goal ? <PreviewSection title="Goal"><Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} variant="body2">{campaign.goal}</Typography></PreviewSection> : null}

      <PreviewSection title="Details">
        <FactList facts={[{ term: "When", value: describeWindow(campaign.startsAt, campaign.endsAt) }]} />
      </PreviewSection>

      <PreviewSection title="Routes">
        {campaign.routes.length === 0
          ? <Typography color="text.secondary" variant="body2">No routes yet. A campaign needs at least one before it can start.</Typography>
          : <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>{campaign.routes.map((route) => <Chip key={`${route.routeId}:${route.moduleId ?? ""}`} label={route.moduleName ? `${route.routeName} · ${route.moduleName}` : route.routeName} size="small" variant="outlined" />)}</Stack>}
      </PreviewSection>

      <PreviewSection title="Who it is for">
        {targeting.length === 0
          ? <Typography color="text.secondary" variant="body2">Anyone on its routes. Add personas, company types or countries to get better suggestions.</Typography>
          : <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>{targeting.map((item) => <Chip key={item} label={item} size="small" />)}</Stack>}
      </PreviewSection>

      <PreviewSection title="Results so far"><FactList facts={facts} /></PreviewSection>
    </Stack>
  );
}
