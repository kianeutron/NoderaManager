import { z } from "zod";

export const noteTargetTypeValues = ["person", "organization", "prospect"] as const;
export type NoteTargetType = (typeof noteTargetTypeValues)[number];

const noteTargetSchema = z.strictObject({ targetType: z.enum(noteTargetTypeValues), targetId: z.uuid() });
export type NoteTarget = z.infer<typeof noteTargetSchema>;

function dedupeTargets(targets: NoteTarget[]): NoteTarget[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.targetType}:${target.targetId}`;
    return !seen.has(key) && seen.add(key);
  });
}

export const maxNoteLength = 10_000;

/** A note can be about several records at once (a meeting with two people at one company). */
export const addNoteInputSchema = z.strictObject({
  body: z.string().trim().min(1).max(maxNoteLength),
  targets: z.array(noteTargetSchema).min(1).max(5).transform(dedupeTargets)
});
export type AddNoteInput = z.infer<typeof addNoteInputSchema>;
