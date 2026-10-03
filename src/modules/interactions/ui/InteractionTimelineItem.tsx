import { Box, Chip, Stack, Typography } from "@mui/material";
import type { InteractionView } from "@/modules/interactions/domain/interaction.types";
import { describeResponseDepth, directionLabel, interactionChannelLabel, interactionTypeLabel, sentimentLabel } from "@/modules/interactions/ui/interaction-presentation";
import { formatDateTime } from "@/shared/lib/format-date";

/** One thing that happened: what it was, which way, when, and what was said. */
export function InteractionTimelineItem({ interaction }: Readonly<{ interaction: InteractionView }>) {
  return (
    <Box sx={{ borderLeft: 2, borderColor: interaction.direction === "inbound" ? "success.main" : "primary.main", pl: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: "baseline", flexWrap: "wrap", gap: 1 }}>
        <Typography sx={{ fontWeight: 700 }} variant="body2">{interactionTypeLabel[interaction.type]}</Typography>
        <Typography color="text.secondary" variant="caption">{directionLabel[interaction.direction]} · {interactionChannelLabel[interaction.channel]} · {formatDateTime(interaction.occurredAt)}</Typography>
      </Stack>
      {interaction.subject ? <Typography sx={{ overflowWrap: "anywhere" }} variant="body2">{interaction.subject}</Typography> : null}
      {interaction.body ? <Typography color="text.secondary" sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} variant="body2">{interaction.body}</Typography> : null}
      {interaction.responseDepth !== null || interaction.sentiment !== null ? (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
          {interaction.responseDepth === null ? null : <Chip label={describeResponseDepth(interaction.responseDepth)} size="small" variant="outlined" />}
          {interaction.sentiment === null ? null : <Chip label={sentimentLabel[interaction.sentiment]} size="small" variant="outlined" />}
        </Stack>
      ) : null}
    </Box>
  );
}
