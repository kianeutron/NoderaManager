import { z } from "zod";
import { organizationTypeValues, personaValues } from "@/shared/db/schema/crm-values";
import { recordScopeSchema, type RecordScope } from "@/shared/api/field-schemas";
import type { UrlStateCodec } from "@/shared/ui/use-url-query-state";

export const workspaceViews = ["people", "companies"] as const;
export type WorkspaceView = (typeof workspaceViews)[number];

// Each parameter falls back on its own, so one hand-edited value never resets the rest of the page.
const paramsSchema = z.object({
  view: z.enum(workspaceViews).catch("people"),
  q: z.string().trim().min(1).max(120).optional().catch(undefined),
  sort: z.enum(["updated", "name"]).catch("updated"),
  persona: z.enum(personaValues).optional().catch(undefined),
  organizationId: z.uuid().optional().catch(undefined),
  type: z.enum(organizationTypeValues).optional().catch(undefined),
  id: z.uuid().optional().catch(undefined),
  scope: recordScopeSchema.catch("active")
});

/** The whole page in one URL: which list, its filters, and which record is open. Filters belong to the view that uses them. */
export type WorkspaceState = Readonly<{
  view: WorkspaceView;
  q: string | undefined;
  sort: "updated" | "name";
  scope: RecordScope;
  persona: (typeof personaValues)[number] | undefined;
  organizationId: string | undefined;
  organizationType: (typeof organizationTypeValues)[number] | undefined;
  selectedId: string | null;
}>;

export const defaultWorkspaceState: WorkspaceState = { view: "people", q: undefined, sort: "updated", scope: "active", persona: undefined, organizationId: undefined, organizationType: undefined, selectedId: null };

/** Whether the current view has a filter beyond the default order. */
export function hasActiveFilters(state: WorkspaceState): boolean {
  const hasScope = state.scope !== "active";
  return state.view === "people" ? Boolean(state.q || state.persona || state.organizationId || hasScope) : Boolean(state.q || state.organizationType || hasScope);
}

export const workspaceUrlCodec: UrlStateCodec<WorkspaceState> = {
  parse(params) {
    const parsed = paramsSchema.parse(Object.fromEntries(params));
    return { view: parsed.view, q: parsed.q, sort: parsed.sort, scope: parsed.scope, persona: parsed.persona, organizationId: parsed.organizationId, organizationType: parsed.type, selectedId: parsed.id ?? null };
  },

  /** Defaults are omitted so the canonical URL stays clean and shareable. */
  serialize(state) {
    const params = new URLSearchParams();
    if (state.view !== defaultWorkspaceState.view) params.set("view", state.view);
    if (state.q) params.set("q", state.q);
    if (state.sort !== defaultWorkspaceState.sort) params.set("sort", state.sort);
    if (state.scope !== defaultWorkspaceState.scope) params.set("scope", state.scope);
    if (state.persona) params.set("persona", state.persona);
    if (state.organizationId) params.set("organizationId", state.organizationId);
    if (state.organizationType) params.set("type", state.organizationType);
    if (state.selectedId) params.set("id", state.selectedId);
    return params.toString();
  }
};
