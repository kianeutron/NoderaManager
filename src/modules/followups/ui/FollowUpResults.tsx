"use client";

import { useState } from "react";
import type { FollowUpSearchQuery } from "@/modules/followups/domain/followup.schema";
import { FollowUpRow } from "@/modules/followups/ui/FollowUpRow";
import { useFollowUpList } from "@/modules/followups/ui/use-followup-queries";
import { EntityList, EntityListSkeleton } from "@/shared/ui/EntityList";
import { KeysetResults } from "@/shared/ui/KeysetResults";

type FollowUpResultsProps = Readonly<{
  status: FollowUpSearchQuery["status"];
  due: FollowUpSearchQuery["due"];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}>;

export function FollowUpResults({ status, due, selectedId, onSelect, hasActiveFilters, onClearFilters }: FollowUpResultsProps) {
  // Active ones read soonest first; finished ones read most recent first.
  const query = useFollowUpList({ status, ...(due ? { due } : {}), sort: status === "active" ? "due" : "recent" });
  // One clock per mount, so every row agrees on what "overdue" means.
  const [now] = useState(() => new Date());

  return (
    <KeysetResults
      emptyFiltered={{ title: "No follow-ups match", description: "Try a different filter." }}
      emptyUnfiltered={{ title: "Nothing to follow up", description: "Add a follow-up to remember who to get back to, and when." }}
      errorMessage={{ title: "Follow-ups could not be loaded", description: "Check your connection and try again." }}
      hasActiveFilters={hasActiveFilters}
      noun={{ singular: "follow-up", plural: "follow-ups" }}
      onClearFilters={onClearFilters}
      query={query}
      skeleton={<EntityListSkeleton count={6} />}
    >
      {(followUps) => <EntityList items={followUps} label="Follow-ups" renderRow={(followUp) => <FollowUpRow followUp={followUp} now={now} onSelect={() => onSelect(followUp.id)} selected={selectedId === followUp.id} />} />}
    </KeysetResults>
  );
}
