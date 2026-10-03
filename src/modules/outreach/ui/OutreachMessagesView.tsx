"use client";

import { Stack } from "@mui/material";
import { OutreachFilterBar } from "@/modules/outreach/ui/OutreachFilterBar";
import { OutreachResults } from "@/modules/outreach/ui/OutreachResults";
import { OutreachSummaryCards } from "@/modules/outreach/ui/OutreachSummaryCards";
import type { OutreachWorkspace } from "@/modules/outreach/ui/use-outreach-workspace";
import { SearchField } from "@/shared/ui/SearchField";
import { SectionPanel } from "@/shared/ui/SectionPanel";

/** The messages that were sent: totals, search, filters and the list. */
export function OutreachMessagesView({ workspace }: Readonly<{ workspace: OutreachWorkspace }>) {
  const { state, setFilters } = workspace;

  return (
    <Stack sx={{ gap: 3.25 }}>
      <OutreachSummaryCards />
      <Stack sx={{ gap: 2.5 }}>
        <SearchField label="Search outreach" onCommit={(value) => setFilters({ q: value.trim() || undefined }, "replace")} placeholder="Person, company or words in the message" value={state.q ?? ""} />
        <SectionPanel title="Messages">
          <Stack sx={{ gap: 2 }}>
            <OutreachFilterBar workspace={workspace} />
            <OutreachResults workspace={workspace} />
          </Stack>
        </SectionPanel>
      </Stack>
    </Stack>
  );
}
