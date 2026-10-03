import { z } from "zod";
import { recordScopeSchema, type RecordScope } from "@/shared/api/field-schemas";
import { campaignStatusValues } from "@/shared/db/schema/crm-values";
import type { UrlStateCodec } from "@/shared/ui/use-url-query-state";

export const strategyViews = ["routes", "campaigns"] as const;
export type StrategyView = (typeof strategyViews)[number];

// Each parameter falls back on its own, so one hand-edited value never resets the rest of the page.
const paramsSchema = z.object({
  view: z.enum(strategyViews).catch("routes"),
  q: z.string().trim().min(1).max(120).optional().catch(undefined),
  status: z.enum(campaignStatusValues).optional().catch(undefined),
  scope: recordScopeSchema.catch("active"),
  id: z.uuid().optional().catch(undefined)
});

/** The whole page in one URL: which list, its filters, and which record is open. Search and status belong to campaigns only. */
export type StrategyState = Readonly<{
  view: StrategyView;
  q: string | undefined;
  campaignStatus: (typeof campaignStatusValues)[number] | undefined;
  scope: RecordScope;
  selectedId: string | null;
}>;

export const defaultStrategyState: StrategyState = { view: "routes", q: undefined, campaignStatus: undefined, scope: "active", selectedId: null };

/** Whether the current view has a filter beyond its defaults. */
export function hasActiveFilters(state: StrategyState): boolean {
  return state.scope !== "active" || (state.view === "campaigns" && Boolean(state.q || state.campaignStatus));
}

export const strategyUrlCodec: UrlStateCodec<StrategyState> = {
  parse(params) {
    const parsed = paramsSchema.parse(Object.fromEntries(params));
    return { view: parsed.view, q: parsed.q, campaignStatus: parsed.status, scope: parsed.scope, selectedId: parsed.id ?? null };
  },

  /** Defaults are omitted so the canonical URL stays clean and shareable. */
  serialize(state) {
    const params = new URLSearchParams();
    if (state.view !== defaultStrategyState.view) params.set("view", state.view);
    if (state.q) params.set("q", state.q);
    if (state.campaignStatus) params.set("status", state.campaignStatus);
    if (state.scope !== defaultStrategyState.scope) params.set("scope", state.scope);
    if (state.selectedId) params.set("id", state.selectedId);
    return params.toString();
  }
};
