import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { routeHref, routesHref } from "@/modules/analytics/ui/overview-links";
import { smallSample } from "@/modules/analytics/ui/overview-presentation";
import { SmallSampleChip } from "@/modules/analytics/ui/SmallSampleChip";
import { formatPercent, shareOf } from "@/shared/ui/charts/percent-change";
import { SectionPanel } from "@/shared/ui/SectionPanel";

const listed = 6;

/** Routes ranked by what they have sent, with replies drawn inside each bar. A rate on too few messages is flagged, not ranked as if it meant something. */
export function RouteLeaderboard({ routes }: Readonly<{ routes: Overview["routes"] }>) {
  const ranked = [...routes].sort((left, right) => right.stats.messages - left.stats.messages || right.stats.prospects - left.stats.prospects).slice(0, listed);
  const peak = Math.max(1, ...ranked.map((route) => route.stats.messages));

  return (
    <SectionPanel action={<Button component={Link} href={routesHref()} size="small">All routes</Button>} description="Messages and replies per route, all time" title="Routes">
      {ranked.length === 0 ? <Typography color="text.secondary">Add a route and log messages against its prospects to compare them here.</Typography> : (
        <Stack component="ul" sx={{ gap: 1.75, listStyle: "none", m: 0, p: 0 }}>
          {ranked.map((route) => (
            <Box component="li" key={route.id}>
              <Stack direction="row" sx={{ alignItems: "baseline", gap: 1, justifyContent: "space-between" }}>
                <Typography component={Link} href={routeHref(route.id)} noWrap sx={{ color: "inherit", fontWeight: 700, textDecoration: "none", "&:hover": { color: "primary.light" } }} variant="body2">{route.name}</Typography>
                <Stack direction="row" sx={{ alignItems: "center", flex: "0 0 auto", gap: 0.75 }}>
                  {route.stats.messages > 0 && route.stats.messages < smallSample ? <SmallSampleChip /> : null}
                  <Typography color="text.secondary" variant="caption">{route.stats.replies} of {route.stats.messages} replied · {formatPercent(shareOf(route.stats.replies, route.stats.messages))}</Typography>
                </Stack>
              </Stack>
              <Box sx={(theme) => ({ backgroundColor: alpha(theme.palette.text.secondary, 0.08), borderRadius: 99, height: 10, mt: 0.75, overflow: "hidden" })}>
                <Box sx={(theme) => ({ background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, borderRadius: 99, height: "100%", minWidth: route.stats.messages > 0 ? 10 : 0, width: `${shareOf(route.stats.messages, peak) * 100}%` })}>
                  <Box sx={(theme) => ({ backgroundColor: theme.palette.success.main, borderRadius: 99, height: "100%", width: `${shareOf(route.stats.replies, route.stats.messages) * 100}%` })} />
                </Box>
              </Box>
              <Typography color="text.secondary" sx={{ fontSize: 11, mt: 0.25 }}>{route.stats.prospects} prospects · {route.stats.won} won</Typography>
            </Box>
          ))}
        </Stack>
      )}
    </SectionPanel>
  );
}
