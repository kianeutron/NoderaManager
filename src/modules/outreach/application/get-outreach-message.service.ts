import type { OutreachRepository } from "@/modules/outreach/data/outreach.repository";
import type { OutreachMessageDetail } from "@/modules/outreach/domain/outreach.types";
import { toOutreachDetail } from "@/modules/outreach/application/outreach-views";

export async function getOutreachMessage(reads: Pick<OutreachRepository, "findMessage">, messageId: string): Promise<OutreachMessageDetail | null> {
  const row = await reads.findMessage(messageId);
  return row ? toOutreachDetail(row) : null;
}
