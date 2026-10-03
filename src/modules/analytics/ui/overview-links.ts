import { defaultStrategyState, strategyUrlCodec } from "@/modules/campaigns/ui/strategy-url-state";
import { defaultOutreachState, outreachUrlCodec } from "@/modules/outreach/ui/outreach-url-state";

const href = (path: string, query: string) => (query ? `${path}?${query}` : path);

// The destination pages own their URL format; these only fill it in, so a change there cannot leave a dead link here.
export const messageHref = (messageId: string) => href("/outreach", outreachUrlCodec.serialize({ ...defaultOutreachState, selectedId: messageId }));
export const followUpsHref = (followUpId?: string) => href("/outreach", outreachUrlCodec.serialize({ ...defaultOutreachState, view: "followups", selectedId: followUpId ?? null }));
export const routeHref = (routeId: string) => href("/routes", strategyUrlCodec.serialize({ ...defaultStrategyState, selectedId: routeId }));
export const campaignHref = (campaignId: string) => href("/routes", strategyUrlCodec.serialize({ ...defaultStrategyState, view: "campaigns", selectedId: campaignId }));
export const unansweredMessagesHref = () => href("/outreach", outreachUrlCodec.serialize({ ...defaultOutreachState, replyStatus: "none" }));
export const routesHref = () => "/routes";
export const campaignsHref = () => href("/routes", strategyUrlCodec.serialize({ ...defaultStrategyState, view: "campaigns" }));
