"use client";

import { defaultStrategyState, strategyUrlCodec, type StrategyState, type StrategyView } from "@/modules/campaigns/ui/strategy-url-state";
import { useUrlQueryState, type NavigationMode } from "@/shared/ui/use-url-query-state";

export type StrategyFilters = Partial<Pick<StrategyState, "q" | "campaignStatus" | "scope">>;

/** Every way the page can change, expressed once. Moving between routes and campaigns starts from a clean slate. */
export function useStrategyWorkspace() {
  const [state, navigate] = useUrlQueryState(strategyUrlCodec);

  return {
    state,
    setFilters: (patch: StrategyFilters, mode: NavigationMode = "push") => navigate({ ...state, ...patch }, mode),
    clearFilters: () => navigate({ ...defaultStrategyState, view: state.view, selectedId: state.selectedId }),
    select: (selectedId: string | null) => navigate({ ...state, selectedId }),
    switchView: (view: StrategyView) => navigate({ ...defaultStrategyState, view })
  };
}

export type StrategyWorkspace = ReturnType<typeof useStrategyWorkspace>;
