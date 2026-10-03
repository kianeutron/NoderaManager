"use client";

import type { BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { doNotContactReasonSchema } from "@/modules/people/domain/person.schema";
import type { PersonDetail } from "@/modules/people/domain/person.types";
import { describeError } from "@/shared/api/error-copy";
import { useSetDoNotContact } from "@/modules/people/ui/use-people-mutations";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { ConfirmDialog } from "@/shared/ui/form/ConfirmDialog";
import { TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";

type DoNotContactDialogProps = Readonly<{ person: PersonDetail; onClose: () => void }>;

/** Marking asks for a reason (it is recorded in the audit trail); lifting it is a plain confirmation. */
export function DoNotContactDialog({ person, onClose }: DoNotContactDialogProps) {
  const mutation = useSetDoNotContact();
  const form = useForm<{ reason: string }>({ defaultValues: { reason: "" }, resolver: commandResolver(doNotContactReasonSchema, (values) => values, ["reason"]) });
  const error = mutation.error ? describeError(mutation.error, "person") : null;

  if (person.doNotContact) {
    return (
      <ConfirmDialog
        confirmLabel="Allow contact"
        description={`${person.fullName} will be available for outreach again. The change is recorded.`}
        error={error}
        onClose={onClose}
        onConfirm={() => mutation.mutate({ personId: person.id, reason: null }, { onSuccess: onClose })}
        pending={mutation.isPending}
        title="Allow contact again?"
      />
    );
  }

  const submit = form.handleSubmit(({ reason }) => mutation.mutateAsync({ personId: person.id, reason }).then(onClose));

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((error: unknown) => markInvalidFields(form, error));

  return (
    <FormDialog error={error} onClose={onClose} onSubmit={onSubmit} submitLabel="Mark do not contact" submitting={mutation.isPending} title={`Do not contact ${person.fullName}`}>
      <TextInputField autoFocus control={form.control} helperText="Why should they not be contacted? This is kept with the record." label="Reason" maxLength={500} multiline name="reason" />
    </FormDialog>
  );
}
