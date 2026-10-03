"use client";

import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { addNoteInputSchema, maxNoteLength, type AddNoteInput } from "@/modules/notes/domain/note.schema";
import type { NoteTargetType } from "@/modules/notes/domain/note.schema";
import type { NoteView } from "@/modules/notes/domain/note.types";
import { addNote } from "@/modules/notes/ui/notes-api";
import { describeError } from "@/shared/api/error-copy";
import { formatDate } from "@/shared/lib/format-date";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { TextInputField } from "@/shared/ui/form/fields";
import { PreviewSection } from "@/shared/ui/PreviewSection";

type NotesSectionProps = Readonly<{
  targetType: NoteTargetType;
  targetId: string;
  notes: readonly NoteView[];
  /** The cache entry that shows this record, refreshed after a note is added. */
  invalidateKey: QueryKey;
}>;

type NoteFormValues = Readonly<{ body: string }>;

/** A record's recent notes with an inline way to add one. Notes are append-only, so there is nothing to edit or delete here. */
export function NotesSection({ targetType, targetId, notes, invalidateKey }: NotesSectionProps) {
  const queryClient = useQueryClient();
  const toInput = ({ body }: NoteFormValues) => ({ body, targets: [{ targetType, targetId }] });
  const form = useForm<NoteFormValues>({ defaultValues: { body: "" }, resolver: commandResolver(addNoteInputSchema, toInput, ["body"]) });
  const mutation = useMutation({
    mutationFn: (input: AddNoteInput) => addNote(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: invalidateKey })
  });

  const submit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(addNoteInputSchema.parse(toInput(values)));
    form.reset();
  });

  // The mutation state already carries the notice, so a rejected submit needs nothing more.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch(() => undefined);

  return (
    <PreviewSection title="Notes">
      <Stack sx={{ gap: 2 }}>
        <Box component="form" onSubmit={onSubmit} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <TextInputField control={form.control} label="Add a note" maxLength={maxNoteLength} multiline name="body" />
          {mutation.error ? <Alert severity="error">{describeError(mutation.error, "note")}</Alert> : null}
          <Button disabled={mutation.isPending} sx={{ alignSelf: "flex-end" }} type="submit" variant="outlined">{mutation.isPending ? "Saving…" : "Add note"}</Button>
        </Box>
        {notes.map((note) => (
          <Box key={note.id}>
            <Typography color="text.secondary" variant="caption">{formatDate(note.createdAt)}</Typography>
            <Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} variant="body2">{note.body}</Typography>
          </Box>
        ))}
      </Stack>
    </PreviewSection>
  );
}
