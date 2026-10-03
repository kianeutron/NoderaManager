"use client";

import { OrganizationRow } from "@/modules/organizations/ui/OrganizationRow";
import { useOrganizationList } from "@/modules/organizations/ui/use-organization-queries";
import { hasActiveFilters } from "@/modules/people/ui/people-workspace-url-state";
import type { PeopleWorkspace } from "@/modules/people/ui/use-people-workspace";
import { EntityList, EntityListSkeleton } from "@/shared/ui/EntityList";
import { KeysetResults } from "@/shared/ui/KeysetResults";

export function OrganizationResults({ workspace }: Readonly<{ workspace: PeopleWorkspace }>) {
  const { state, select, clearFilters } = workspace;
  const query = useOrganizationList({ q: state.q, organizationType: state.organizationType, sort: state.sort, scope: state.scope });

  return (
    <KeysetResults
      emptyFiltered={{ title: "No companies match", description: "Try a different search or clear the filters." }}
      emptyUnfiltered={{ title: "No companies yet", description: "Companies you add, import or discover will appear here." }}
      errorMessage={{ title: "Companies could not be loaded", description: "Check your connection and try again." }}
      hasActiveFilters={hasActiveFilters(state)}
      noun={{ singular: "company", plural: "companies" }}
      onClearFilters={clearFilters}
      query={query}
      skeleton={<EntityListSkeleton count={6} />}
    >
      {(organizations) => <EntityList items={organizations} label="Companies" renderRow={(organization) => <OrganizationRow onSelect={() => select(organization.id)} organization={organization} selected={state.selectedId === organization.id} />} />}
    </KeysetResults>
  );
}
