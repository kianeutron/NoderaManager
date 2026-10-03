"use client";

import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";
import { CampaignRow } from "@/modules/campaigns/ui/CampaignRow";
import { useCampaignList } from "@/modules/campaigns/ui/use-campaign-queries";
import type { RecordScope } from "@/shared/api/field-schemas";
import { EntityList, EntityListSkeleton } from "@/shared/ui/EntityList";
import { KeysetResults } from "@/shared/ui/KeysetResults";

type CampaignResultsProps = Readonly<{
  q: string | undefined;
  status: CampaignStatus | undefined;
  scope: RecordScope;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}>;

export function CampaignResults({ q, status, scope, selectedId, onSelect, hasActiveFilters, onClearFilters }: CampaignResultsProps) {
  const query = useCampaignList({ ...(q ? { q } : {}), ...(status ? { status } : {}), scope, sort: "updated" });

  return (
    <KeysetResults
      emptyFiltered={{ title: "No campaigns match", description: "Try a different search or clear the filters." }}
      emptyUnfiltered={{ title: "No campaigns yet", description: "A campaign groups the prospects you are working on one route, with a goal and a time window." }}
      errorMessage={{ title: "Campaigns could not be loaded", description: "Check your connection and try again." }}
      hasActiveFilters={hasActiveFilters}
      noun={{ singular: "campaign", plural: "campaigns" }}
      onClearFilters={onClearFilters}
      query={query}
      skeleton={<EntityListSkeleton count={5} />}
    >
      {(campaigns) => <EntityList items={campaigns} label="Campaigns" renderRow={(campaign) => <CampaignRow campaign={campaign} onSelect={() => onSelect(campaign.id)} selected={selectedId === campaign.id} />} />}
    </KeysetResults>
  );
}
