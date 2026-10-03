"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import type { BaseSyntheticEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { createFollowUpInputSchema, followUpChangesSchema } from "@/modules/followups/domain/followup.schema";
import type { FollowUpView } from "@/modules/followups/domain/followup.types";
import { dueAtInDays, emptyFollowUpForm, followUpToFormValues, toCreateFollowUpInput, toFollowUpChanges, toFollowUpEditValidationInput, type FollowUpFormValues, type FollowUpOrigin } from "@/modules/followups/ui/followup-form";
import { followUpChannelLabel } from "@/modules/followups/ui/followup-presentation";
import { useCreateFollowUp, useUpdateFollowUp } from "@/modules/followups/ui/use-followup-mutations";
import { OutreachTargetPicker } from "@/modules/outreach/ui/OutreachTargetPicker";
import { describeError } from "@/shared/api/error-copy";
import { outreachChannelValues } from "@/shared/db/schema/crm-values";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { SelectField, TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

const channelOptions = outreachChannelValues.map((value) => ({ value, label: followUpChannelLabel[value] }));
const quickDueChoices = [{ label: "Tomorrow", days: 1 }, { label: "In a week", days: 7 }, { label: "In a month", days: 30 }] as const;
const fieldNames = Object.keys(emptyFollowUpForm);
// The command names the field `prospectId`; the form holds the whole target, so that issue belongs to the picker.
const renames = { prospectId: "target" } as const;

type FollowUpFormProps = Readonly<{
  /** Absent when adding. */
  followUp?: FollowUpView;
  /** When adding from a message the prospect is already known: who it is for, and where it came from. */
  origin?: FollowUpOrigin & Readonly<{ label: string }>;
  onClose: () => void;
  onSaved: (followUpId: string) => void;
}>;

/** Plans getting back to a prospect: why, and optionally when. A due date is a deadline; "not before" is the earliest sensible moment. */
export function FollowUpForm({ followUp, origin, onClose, onSaved }: FollowUpFormProps) {
  const initial = followUp ? followUpToFormValues(followUp) : emptyFollowUpForm;
  const form = useForm<FollowUpFormValues>({
    defaultValues: initial,
    resolver: followUp
      ? commandResolver(followUpChangesSchema, (values) => toFollowUpEditValidationInput(values, initial), fieldNames)
      : commandResolver(createFollowUpInputSchema, (values) => toCreateFollowUpInput(values, origin), fieldNames, renames)
  });
  const create = useCreateFollowUp();
  const update = useUpdateFollowUp();
  const pending = create.isPending || update.isPending;
  const failure = create.error ?? update.error;
  const error = failure ? describeError(failure, "follow-up") : form.formState.errors.root?.message ?? null;

  const submit = form.handleSubmit(async (values) => {
    if (followUp) {
      const changes = toFollowUpChanges(values, initial);
      if (Object.keys(changes).length > 0) await update.mutateAsync({ followUpId: followUp.id, changes: followUpChangesSchema.parse(changes) });
      onSaved(followUp.id);
      return;
    }
    const result = await create.mutateAsync(createFollowUpInputSchema.parse(toCreateFollowUpInput(values, origin)));
    onSaved(result.followUpId);
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((failed: unknown) => markInvalidFields(form, failed));

  return (
    <FormDialog error={error} onClose={onClose} onSubmit={onSubmit} submitDisabled={followUp !== undefined && !form.formState.isDirty} submitLabel={followUp ? "Save changes" : "Add follow-up"} submitting={pending} title={followUp ? "Edit follow-up" : "Add follow-up"}>
      {followUp ? null : origin
        ? <Typography color="text.secondary" variant="body2">For {origin.label}</Typography>
        : <Controller control={form.control} name="target" render={({ field }) => <OutreachTargetPicker error={form.formState.errors.target?.message} onChange={field.onChange} value={field.value} />} />}
      <TextInputField control={form.control} helperText="What to get back to them about" label="Reason" maxLength={500} multiline name="reason" />
      <Stack sx={{ gap: 1 }}>
        <TextInputField control={form.control} helperText="The deadline. Leave empty for no date yet." label="Due" name="dueAt" type="datetime-local" />
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
          {quickDueChoices.map(({ label, days }) => <Chip clickable key={label} label={label} onClick={() => form.setValue("dueAt", dueAtInDays(days, new Date()), { shouldDirty: true, shouldValidate: true })} size="small" variant="outlined" />)}
        </Stack>
      </Stack>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <TextInputField control={form.control} helperText="The earliest sensible moment" label="Not before" name="notBeforeAt" type="datetime-local" />
        <SelectField control={form.control} emptyLabel="No suggestion" label="Suggested channel" name="suggestedChannel" options={channelOptions} />
      </Box>
    </FormDialog>
  );
}
