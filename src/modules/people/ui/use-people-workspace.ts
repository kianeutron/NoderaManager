"use client";

import { defaultWorkspaceState, workspaceUrlCodec, type WorkspaceState, type WorkspaceView } from "@/modules/people/ui/people-workspace-url-state";
import { useUrlQueryState, type NavigationMode } from "@/shared/ui/use-url-query-state";

export type WorkspaceFilters = Partial<Pick<WorkspaceState, "q" | "sort" | "scope" | "persona" | "organizationId" | "organizationType">>;

/** Every way the page can change, expressed once. Moves between the two lists start from a clean slate. */
export function usePeopleWorkspace() {
  const [state, navigate] = useUrlQueryState(workspaceUrlCodec);
  const fresh = (view: WorkspaceView, rest: Partial<WorkspaceState> = {}): WorkspaceState => ({ ...defaultWorkspaceState, view, ...rest });

  return {
    state,
    setFilters: (patch: WorkspaceFilters, mode: NavigationMode = "push") => navigate({ ...state, ...patch }, mode),
    clearFilters: () => navigate(fresh(state.view, { selectedId: state.selectedId })),
    select: (selectedId: string | null) => navigate({ ...state, selectedId }),
    switchView: (view: WorkspaceView) => navigate(fresh(view)),
    openPerson: (personId: string) => navigate(fresh("people", { selectedId: personId })),
    openOrganization: (organizationId: string) => navigate(fresh("companies", { selectedId: organizationId })),
    showPeopleOf: (organizationId: string) => navigate(fresh("people", { organizationId }))
  };
}

export type PeopleWorkspace = ReturnType<typeof usePeopleWorkspace>;
