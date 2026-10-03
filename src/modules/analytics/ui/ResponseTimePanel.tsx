import { Stack, Typography } from "@mui/material";
import type { ResponseTimeBucket } from "@/modules/analytics/domain/analytics-values";
import type { Insights } from "@/modules/analytics/domain/analytics.types";
import { SmallSampleChip } from "@/modules/analytics/ui/SmallSampleChip";
import { smallSample } from "@/modules/analytics/ui/overview-presentation";
import { formatHours } from "@/shared/lib/format-duration";
import { BarRows } from "@/shared/ui/charts/BarRows";
import { SectionPanel } from "@/shared/ui/SectionPanel";

const bucketLabel = { hour: "Within an hour", day: "Within a day", three_days: "Within 3 days", week: "Within a week", later: "Over a week" } as const satisfies Record<ResponseTimeBucket, string>;

/** How long people take to answer, so you know how long to wait before a nudge. */
export function ResponseTimePanel({ responseTime }: Readonly<{ responseTime: Insights["responseTime"] }>) {
  const { sample, medianHours, buckets } = responseTime;

  return (
    <SectionPanel description="Time from sending to the first real reply" title="Reply time">
      {sample === 0 ? <Typography color="text.secondary">No replies to messages sent in this window yet.</Typography> : (
        <Stack sx={{ gap: 2 }}>
          <Stack direction="row" sx={{ alignItems: "baseline", flexWrap: "wrap", gap: 1.5 }}>
            <Typography sx={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em" }}>{medianHours === null ? "—" : formatHours(medianHours)}</Typography>
            <Typography color="text.secondary" variant="body2">median, from {sample.toLocaleString("en")} {sample === 1 ? "reply" : "replies"}</Typography>
            {sample < smallSample ? <SmallSampleChip /> : null}
          </Stack>
          <BarRows label="Replies by how quickly they came" rows={buckets.map((band) => ({ key: band.bucket, label: bucketLabel[band.bucket], value: band.replies }))} />
        </Stack>
      )}
    </SectionPanel>
  );
}
