"use client";

import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { overviewRangeValues, type OverviewRange } from "@/modules/analytics/domain/analytics.schema";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { briefingOf, greetingFor, rangeLabel } from "@/modules/analytics/ui/overview-presentation";
import { LogOutreachDialog } from "@/modules/outreach/ui/LogOutreachDialog";
import { GlassPanel } from "@/shared/ui/GlassPanel";
import { RangeToggle } from "@/shared/ui/RangeToggle";

const longDate = new Intl.DateTimeFormat("en", { dateStyle: "full" });

type OverviewHeroProps = Readonly<{
  overview: Pick<Overview, "followUps" | "awaitingReply" | "totals" | "days"> | undefined;
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
  now: Date;
}>;

/** The page's first line: what needs doing today, the window everything below is measured over, and the one thing you do most. */
export function OverviewHero({ overview, range, onRangeChange, now }: OverviewHeroProps) {
  return (
    <GlassPanel
      blur
      highlight
      sx={(theme) => ({
        p: { xs: 2.5, md: 3.5 },
        "&::before": {
          content: '""', position: "absolute", inset: "-45%", zIndex: -1, filter: "blur(42px)", opacity: 0.9,
          background: `radial-gradient(34% 34% at 22% 38%, ${alpha(theme.palette.primary.main, 0.42)}, transparent 70%), radial-gradient(30% 30% at 78% 22%, ${alpha(theme.palette.secondary.main, 0.38)}, transparent 70%), radial-gradient(26% 26% at 62% 80%, ${alpha(theme.palette.success.main, 0.22)}, transparent 70%)`,
          "@media (prefers-reduced-motion: no-preference)": { animation: "heroDrift 24s ease-in-out infinite alternate" }
        },
        "@keyframes heroDrift": { from: { transform: "translate3d(-3%, -2%, 0) rotate(0deg)" }, to: { transform: "translate3d(3%, 2%, 0) rotate(8deg)" } }
      })}
    >
      <Stack direction={{ xs: "column", md: "row" }} sx={{ alignItems: { md: "flex-end" }, gap: 3, justifyContent: "space-between" }}>
        <Box sx={{ maxWidth: 720 }}>
          <Typography color="primary.light" variant="overline">{longDate.format(now)}</Typography>
          <Typography component="h1" sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, letterSpacing: "-0.04em", lineHeight: 1.05 }} variant="h4">{greetingFor(now.getHours())}.</Typography>
          <Typography aria-live="polite" sx={{ fontSize: { xs: "1.05rem", md: "1.2rem" }, mt: 1.25 }}>{overview ? briefingOf(overview) : "Reading your pipeline…"}</Typography>
        </Box>
        <Stack sx={{ alignItems: { xs: "stretch", md: "flex-end" }, gap: 1.5 }}>
          <RangeToggle label="Time window" labels={rangeLabel} onChange={onRangeChange} options={overviewRangeValues} value={range} />
          {/* Logging a message marks the figures stale, so they refresh without any help from here. */}
          <LogOutreachDialog onSaved={() => undefined} />
        </Stack>
      </Stack>
    </GlassPanel>
  );
}
