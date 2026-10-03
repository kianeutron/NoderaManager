import { Stack } from "@mui/material";
import { channelLabel, replyLabel } from "@/modules/outreach/ui/outreach-presentation";
import type { OutreachWorkspace } from "@/modules/outreach/ui/use-outreach-workspace";
import { outreachChannelValues, replyStatusValues } from "@/shared/db/schema/crm-values";
import { FilterSelect } from "@/shared/ui/FilterSelect";

const channelOptions = outreachChannelValues.map((value) => ({ value, label: channelLabel[value] }));
const replyOptions = replyStatusValues.map((value) => ({ value, label: replyLabel[value] }));

export function OutreachFilterBar({ workspace }: Readonly<{ workspace: OutreachWorkspace }>) {
  const { state, setFilters } = workspace;

  return (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
      <FilterSelect allLabel="All channels" label="Channel" onChange={(value) => setFilters({ channel: channelOptions.find((option) => option.value === value)?.value })} options={channelOptions} value={state.channel ?? ""} />
      <FilterSelect allLabel="Any reply" label="Reply" onChange={(value) => setFilters({ replyStatus: replyOptions.find((option) => option.value === value)?.value })} options={replyOptions} value={state.replyStatus ?? ""} />
    </Stack>
  );
}
