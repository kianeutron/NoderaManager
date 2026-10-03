import { toProspectSummary } from "@/modules/prospects/application/prospect-views";
import type { NoteRepository } from "@/modules/notes/data/note.repository";
import type { ProspectRepository } from "@/modules/prospects/data/prospect.repository";
import type { ProspectDetail } from "@/modules/prospects/domain/prospect.types";

type GetProspectDependencies = Readonly<{
  reads: Pick<ProspectRepository, "findProspect" | "listSignals">;
  notes: Pick<NoteRepository, "listNotes">;
}>;

const signalLimit = 20;
const recentNoteLimit = 10;

export async function getProspect({ reads, notes }: GetProspectDependencies, prospectId: string): Promise<ProspectDetail | null> {
  const prospect = await reads.findProspect(prospectId);
  if (!prospect) return null;

  const [signals, recentNotes] = await Promise.all([
    reads.listSignals(prospectId, signalLimit),
    notes.listNotes({ targetType: "prospect", targetId: prospectId }, recentNoteLimit)
  ]);

  return {
    ...toProspectSummary(prospect),
    source: prospect.source,
    whyTargeted: prospect.whyTargeted,
    currentTrigger: prospect.currentTrigger,
    structuralReason: prospect.structuralReason,
    statusChangedAt: prospect.statusChangedAt.toISOString(),
    signals: signals.map((signal) => ({ ...signal, observedAt: signal.observedAt.toISOString(), expiresAt: signal.expiresAt?.toISOString() ?? null })),
    recentNotes: recentNotes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() }))
  };
}
