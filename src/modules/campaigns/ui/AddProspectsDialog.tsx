"use client";

import { Box, Checkbox, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { useState, type BaseSyntheticEvent } from "react";
import { useAddCampaignProspects } from "@/modules/campaigns/ui/use-campaign-mutations";
import { useCampaignSuggestions } from "@/modules/campaigns/ui/use-campaign-queries";
import { describeError } from "@/shared/api/error-copy";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { SearchField } from "@/shared/ui/SearchField";

type AddProspectsDialogProps = Readonly<{ campaignId: string; onClose: () => void }>;

/**
 * Prospects that could join: open, contactable, on the campaign's routes and not in it yet, those that fit its targeting
 * first. Nothing is added by rule; the owner ticks the ones they want.
 */
export function AddProspectsDialog({ campaignId, onClose }: AddProspectsDialogProps) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const suggestions = useCampaignSuggestions(campaignId, q.trim() || undefined);
  const mutation = useAddCampaignProspects();

  const toggle = (prospectId: string) => setSelected((current) => {
    const next = new Set(current);
    if (!next.delete(prospectId)) next.add(prospectId);
    return next;
  });

  const onSubmit = (event: BaseSyntheticEvent) => {
    event.preventDefault();
    void mutation.mutateAsync({ campaignId, prospectIds: [...selected] }).then(onClose, () => undefined);
  };

  const error = mutation.error ?? suggestions.error;

  return (
    <FormDialog error={error ? describeError(error, "campaign") : null} onClose={onClose} onSubmit={onSubmit} submitDisabled={selected.size === 0} submitLabel={selected.size > 0 ? `Add ${selected.size}` : "Add"} submitting={mutation.isPending} title="Add prospects">
      <SearchField label="Search prospects" onCommit={setQ} placeholder="Person or company" value={q} />
      {suggestions.isPending ? <Skeleton aria-label="Loading prospects" height={120} variant="rounded" /> : null}
      {suggestions.data?.length === 0 ? <Typography color="text.secondary" variant="body2">{q ? "No matching prospects." : "No prospects to suggest. Anyone already added, closed, or on another route is left out."}</Typography> : null}
      <Stack sx={{ gap: 0.5 }}>
        {suggestions.data?.map((suggestion) => {
          const name = [suggestion.person?.fullName, suggestion.organization?.name].filter(Boolean).join(" · ") || "Unnamed prospect";
          return (
            <Stack component="label" direction="row" key={suggestion.prospectId} sx={{ alignItems: "center", cursor: "pointer", gap: 1 }}>
              <Checkbox checked={selected.has(suggestion.prospectId)} onChange={() => toggle(suggestion.prospectId)} slotProps={{ input: { "aria-label": name } }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ overflowWrap: "anywhere" }} variant="body2">{name}</Typography>
                <Typography color="text.secondary" variant="caption">{[suggestion.routeName, suggestion.moduleName].filter(Boolean).join(" · ")}</Typography>
              </Box>
              {suggestion.matchesRules ? <Chip color="primary" label="Fits targeting" size="small" variant="outlined" /> : null}
            </Stack>
          );
        })}
      </Stack>
    </FormDialog>
  );
}
