"use client";

import { OutreachRow } from "@/modules/outreach/ui/OutreachRow";
import { hasActiveFilters } from "@/modules/outreach/ui/outreach-url-state";
import type { OutreachWorkspace } from "@/modules/outreach/ui/use-outreach-workspace";
import { useOutreachList } from "@/modules/outreach/ui/use-outreach-queries";
import { EntityList, EntityListSkeleton } from "@/shared/ui/EntityList";
import { KeysetResults } from "@/shared/ui/KeysetResults";

export function OutreachResults({ workspace }: Readonly<{ workspace: OutreachWorkspace }>) {
  const { state, select, clearFilters } = workspace;
  const query = useOutreachList({ q: state.q, channel: state.channel, replyStatus: state.replyStatus, sort: "sent" });

  return (
    <KeysetResults
      emptyFiltered={{ title: "No messages match", description: "Try a different search or clear the filters." }}
      emptyUnfiltered={{ title: "No outreach logged yet", description: "Log a message after you send it, and it will appear here." }}
      errorMessage={{ title: "Outreach could not be loaded", description: "Check your connection and try again." }}
      hasActiveFilters={hasActiveFilters(state)}
      noun={{ singular: "message", plural: "messages" }}
      onClearFilters={clearFilters}
      query={query}
      skeleton={<EntityListSkeleton count={6} />}
    >
      {(messages) => <EntityList items={messages} label="Outreach messages" renderRow={(message) => <OutreachRow message={message} onSelect={() => select(message.id)} selected={state.selectedId === message.id} />} />}
    </KeysetResults>
  );
}
