"use client";

import type { BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { dismissReasonSchema } from "@/modules/followups/domain/followup.schema";
import { useDismissFollowUp } from "@/modules/followups/ui/use-followup-mutations";
import { describeError } from "@/shared/api/error-copy";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

type DismissFollowUpDialogProps = Readonly<{ followUpId: string; onClose: () => void }>;

/** Letting a follow-up go keeps why, so the history says more than "gone". */
export function DismissFollowUpDialog({ followUpId, onClose }: DismissFollowUpDialogProps) {
  const mutation = useDismissFollowUp();
  const form = useForm<{ reason: string }>({ defaultValues: { reason: "" }, resolver: commandResolver(dismissReasonSchema, (values) => values, ["reason"]) });

  const submit = form.handleSubmit(async ({ reason }) => {
    await mutation.mutateAsync({ followUpId, reason: dismissReasonSchema.parse({ reason }).reason });
    onClose();
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((error: unknown) => markInvalidFields(form, error));

  return (
    <FormDialog error={mutation.error ? describeError(mutation.error, "follow-up") : null} onClose={onClose} onSubmit={onSubmit} submitLabel="Dismiss" submitting={mutation.isPending} title="Dismiss this follow-up?">
      <TextInputField autoFocus control={form.control} helperText="Why it is no longer worth pursuing. This is kept with it." label="Reason" maxLength={500} multiline name="reason" />
    </FormDialog>
  );
}
