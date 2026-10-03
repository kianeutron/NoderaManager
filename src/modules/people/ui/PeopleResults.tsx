"use client";

import { PersonRow } from "@/modules/people/ui/PersonRow";
import type { PeopleWorkspace } from "@/modules/people/ui/use-people-workspace";
import { hasActiveFilters } from "@/modules/people/ui/people-workspace-url-state";
import { usePeopleList } from "@/modules/people/ui/use-people-queries";
import { EntityList, EntityListSkeleton } from "@/shared/ui/EntityList";
import { KeysetResults } from "@/shared/ui/KeysetResults";

export function PeopleResults({ workspace }: Readonly<{ workspace: PeopleWorkspace }>) {
  const { state, select, clearFilters } = workspace;
  const query = usePeopleList({ q: state.q, persona: state.persona, organizationId: state.organizationId, sort: state.sort, scope: state.scope });

  return (
    <KeysetResults
      emptyFiltered={{ title: "No people match", description: "Try a different search or clear the filters." }}
      emptyUnfiltered={{ title: "No people yet", description: "People you add, import or discover will appear here." }}
      errorMessage={{ title: "People could not be loaded", description: "Check your connection and try again." }}
      hasActiveFilters={hasActiveFilters(state)}
      noun={{ singular: "person", plural: "people" }}
      onClearFilters={clearFilters}
      query={query}
      skeleton={<EntityListSkeleton count={6} />}
    >
      {(people) => <EntityList items={people} label="People" renderRow={(person) => <PersonRow onSelect={() => select(person.id)} person={person} selected={state.selectedId === person.id} />} />}
    </KeysetResults>
  );
}
