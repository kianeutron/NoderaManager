"use client";

import { Stack } from "@mui/material";
import { CampaignFilterBar } from "@/modules/campaigns/ui/CampaignFilterBar";
import { CampaignResults } from "@/modules/campaigns/ui/CampaignResults";
import { hasActiveFilters } from "@/modules/campaigns/ui/strategy-url-state";
import type { StrategyWorkspace } from "@/modules/campaigns/ui/use-strategy-workspace";
import { SearchField } from "@/shared/ui/SearchField";
import { SectionPanel } from "@/shared/ui/SectionPanel";

/** The campaigns: search, filters and the list. */
export function CampaignsView({ workspace }: Readonly<{ workspace: StrategyWorkspace }>) {
  const { state, setFilters, select, clearFilters } = workspace;

  return (
    <Stack sx={{ gap: 2.5 }}>
      <SearchField label="Search campaigns" onCommit={(value) => setFilters({ q: value.trim() || undefined }, "replace")} placeholder="Campaign name" value={state.q ?? ""} />
      <SectionPanel title="Campaigns">
        <Stack sx={{ gap: 2 }}>
          <CampaignFilterBar onChange={(patch) => setFilters({ campaignStatus: patch.status, ...(patch.scope ? { scope: patch.scope } : {}) })} scope={state.scope} status={state.campaignStatus} />
          <CampaignResults hasActiveFilters={hasActiveFilters(state)} onClearFilters={clearFilters} onSelect={select} q={state.q} scope={state.scope} selectedId={state.selectedId} status={state.campaignStatus} />
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
