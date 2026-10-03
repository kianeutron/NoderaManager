"use client";

import { defaultOutreachState, outreachUrlCodec, type OutreachState, type OutreachView } from "@/modules/outreach/ui/outreach-url-state";
import { useUrlQueryState, type NavigationMode } from "@/shared/ui/use-url-query-state";

export type OutreachFilters = Partial<Pick<OutreachState, "q" | "channel" | "replyStatus" | "followUpStatus" | "followUpDue">>;

/** Every way the page can change, expressed once. Moving between the two lists starts from a clean slate. */
export function useOutreachWorkspace() {
  const [state, navigate] = useUrlQueryState(outreachUrlCodec);

  return {
    state,
    setFilters: (patch: OutreachFilters, mode: NavigationMode = "push") => navigate({ ...state, ...patch }, mode),
    clearFilters: () => navigate({ ...defaultOutreachState, view: state.view, selectedId: state.selectedId }),
    select: (selectedId: string | null) => navigate({ ...state, selectedId }),
    switchView: (view: OutreachView) => navigate({ ...defaultOutreachState, view })
  };
}

export type OutreachWorkspace = ReturnType<typeof useOutreachWorkspace>;
