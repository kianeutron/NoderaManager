"use client";

import { Stack } from "@mui/material";
import { FollowUpFilterBar } from "@/modules/followups/ui/FollowUpFilterBar";
import { FollowUpResults } from "@/modules/followups/ui/FollowUpResults";
import { FollowUpSummaryCards } from "@/modules/followups/ui/FollowUpSummaryCards";
import { hasActiveFilters } from "@/modules/outreach/ui/outreach-url-state";
import type { OutreachWorkspace } from "@/modules/outreach/ui/use-outreach-workspace";
import { SectionPanel } from "@/shared/ui/SectionPanel";

/** Who to get back to and when: counts by due date, the filters and the list. */
export function OutreachFollowUpsView({ workspace }: Readonly<{ workspace: OutreachWorkspace }>) {
  const { state, setFilters, select, clearFilters } = workspace;

  return (
    <Stack sx={{ gap: 3.25 }}>
      <FollowUpSummaryCards />
      <SectionPanel title="Follow-ups">
        <Stack sx={{ gap: 2 }}>
          <FollowUpFilterBar due={state.followUpDue} onChange={(patch) => setFilters(patch)} status={state.followUpStatus} />
          <FollowUpResults due={state.followUpDue} hasActiveFilters={hasActiveFilters(state)} onClearFilters={clearFilters} onSelect={select} selectedId={state.selectedId} status={state.followUpStatus} />
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
