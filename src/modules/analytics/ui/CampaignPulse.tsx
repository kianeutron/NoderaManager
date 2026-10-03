"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { campaignHref, campaignsHref } from "@/modules/analytics/ui/overview-links";
import { describeWindow } from "@/modules/campaigns/ui/campaign-presentation";
import { formatPercent, shareOf } from "@/shared/ui/charts/percent-change";
import { RadialGauge } from "@/shared/ui/charts/RadialGauge";
import { useChartColors } from "@/shared/ui/charts/use-chart-colors";
import { GlassPanel } from "@/shared/ui/GlassPanel";
import { SectionPanel } from "@/shared/ui/SectionPanel";

/** Each running campaign as a ring of how many of its prospects have been contacted, with what it has produced. */
export function CampaignPulse({ campaigns }: Readonly<{ campaigns: Overview["campaigns"] }>) {
  const colors = useChartColors();

  return (
    <SectionPanel action={<Button component={Link} href={campaignsHref()} size="small">All campaigns</Button>} description="Campaigns that are active now" title="Campaigns">
      {campaigns.length === 0 ? <Typography color="text.secondary">No campaign is running. Start one from Routes &amp; campaigns when you are ready to work a route.</Typography> : (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fill, minmax(260px, 1fr))" } }}>
          {campaigns.map((campaign) => {
            const share = shareOf(campaign.stats.contacted, campaign.stats.members);
            return (
              <Box component={Link} href={campaignHref(campaign.id)} key={campaign.id} sx={{ color: "inherit", display: "block", textDecoration: "none", transition: "transform 160ms ease", "&:hover": { transform: "translateY(-2px)" } }}>
                <GlassPanel sx={{ alignItems: "center", display: "flex", gap: 2, p: 2 }}>
                  <RadialGauge color={colors.secondary} label={`${campaign.stats.contacted} of ${campaign.stats.members} prospects contacted`} share={share} size={68} thickness={7}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{formatPercent(share)}</Typography>
                  </RadialGauge>
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 700 }}>{campaign.name}</Typography>
                    <Typography color="text.secondary" noWrap variant="caption">{describeWindow(campaign.startsAt, campaign.endsAt)}</Typography>
                    <Typography color="text.secondary" variant="caption">{campaign.stats.contacted} of {campaign.stats.members} contacted · {campaign.stats.messages} sent · {campaign.stats.replies} replied</Typography>
                  </Stack>
                </GlassPanel>
              </Box>
            );
          })}
        </Box>
      )}
    </SectionPanel>
  );
}
