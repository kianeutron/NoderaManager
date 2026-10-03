import type { AwaitingReply, ChannelActivity, DepthStep, PerformanceRow, PipelineStage } from "@/modules/analytics/domain/analytics.types";
import { maxResponseDepth, outreachChannelValues, prospectStatusValues } from "@/shared/db/schema/crm-values";

/** Every status in lifecycle order, including the empty ones, so the pipeline always has the same shape. */
export function toPipeline(rows: readonly Readonly<{ status: PipelineStage["status"]; prospects: number }>[]): PipelineStage[] {
  const counts = new Map(rows.map((row) => [row.status, row.prospects]));
  return prospectStatusValues.map((status) => ({ status, prospects: counts.get(status) ?? 0 }));
}

/** Every channel, quiet ones as zero, from the channel breakdown. */
export function toChannels(rows: readonly Pick<PerformanceRow, "key" | "sent" | "repliedMessages">[]): ChannelActivity[] {
  const byChannel = new Map(rows.map((row) => [row.key, row]));
  return outreachChannelValues.map((channel) => ({ channel, sent: byChannel.get(channel)?.sent ?? 0, replied: byChannel.get(channel)?.repliedMessages ?? 0 }));
}

/** Steps 1 to 9, including the ones nobody has reached. */
export function toDepthSteps(rows: readonly DepthStep[]): DepthStep[] {
  const counts = new Map(rows.map((row) => [row.depth, row.prospects]));
  return Array.from({ length: maxResponseDepth }, (_, index) => ({ depth: index + 1, prospects: counts.get(index + 1) ?? 0 }));
}

export const toAwaitingReply = (row: Omit<AwaitingReply, "sentAt"> & Readonly<{ sentAt: Date }>): AwaitingReply => ({ ...row, sentAt: row.sentAt.toISOString() });
