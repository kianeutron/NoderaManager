import { z } from "zod";
import { followUpDueValues } from "@/modules/followups/domain/followup.schema";
import { followUpStatusValues, outreachChannelValues, replyStatusValues } from "@/shared/db/schema/crm-values";
import type { UrlStateCodec } from "@/shared/ui/use-url-query-state";

export const outreachViews = ["messages", "followups"] as const;
export type OutreachView = (typeof outreachViews)[number];

// Each parameter falls back on its own, so one hand-edited value never resets the rest of the page.
const paramsSchema = z.object({
  view: z.enum(outreachViews).catch("messages"),
  q: z.string().trim().min(1).max(120).optional().catch(undefined),
  channel: z.enum(outreachChannelValues).optional().catch(undefined),
  reply: z.enum(replyStatusValues).optional().catch(undefined),
  status: z.enum(followUpStatusValues).catch("active"),
  due: z.enum(followUpDueValues).optional().catch(undefined),
  id: z.uuid().optional().catch(undefined)
});

/** The whole page in one URL: which list, its filters, and which record is open. Filters belong to the view that uses them. */
export type OutreachState = Readonly<{
  view: OutreachView;
  q: string | undefined;
  channel: (typeof outreachChannelValues)[number] | undefined;
  replyStatus: (typeof replyStatusValues)[number] | undefined;
  followUpStatus: (typeof followUpStatusValues)[number];
  followUpDue: (typeof followUpDueValues)[number] | undefined;
  selectedId: string | null;
}>;

export const defaultOutreachState: OutreachState = { view: "messages", q: undefined, channel: undefined, replyStatus: undefined, followUpStatus: "active", followUpDue: undefined, selectedId: null };

/** Whether the current view has a filter beyond its defaults. */
export function hasActiveFilters(state: OutreachState): boolean {
  return state.view === "messages" ? Boolean(state.q || state.channel || state.replyStatus) : state.followUpStatus !== "active" || state.followUpDue !== undefined;
}

export const outreachUrlCodec: UrlStateCodec<OutreachState> = {
  parse(params) {
    const parsed = paramsSchema.parse(Object.fromEntries(params));
    return { view: parsed.view, q: parsed.q, channel: parsed.channel, replyStatus: parsed.reply, followUpStatus: parsed.status, followUpDue: parsed.due, selectedId: parsed.id ?? null };
  },

  /** Defaults are omitted so the canonical URL stays clean and shareable. */
  serialize(state) {
    const params = new URLSearchParams();
    if (state.view !== defaultOutreachState.view) params.set("view", state.view);
    if (state.q) params.set("q", state.q);
    if (state.channel) params.set("channel", state.channel);
    if (state.replyStatus) params.set("reply", state.replyStatus);
    if (state.followUpStatus !== defaultOutreachState.followUpStatus) params.set("status", state.followUpStatus);
    if (state.followUpDue) params.set("due", state.followUpDue);
    if (state.selectedId) params.set("id", state.selectedId);
    return params.toString();
  }
};
