"use client";

import type { BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { bounceKindValues, logBounceInputSchema } from "@/modules/interactions/domain/interaction.schema";
import type { BounceStatus } from "@/modules/interactions/domain/interaction.types";
import { bounceKindLabel } from "@/modules/interactions/ui/interaction-presentation";
import { useLogBounce } from "@/modules/interactions/ui/use-interaction-mutations";
import { describeError } from "@/shared/api/error-copy";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { SelectField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

const bounceOptions = bounceKindValues.map((value) => ({ value, label: bounceKindLabel[value] }));

type ReportBounceFormValues = Readonly<{ bounceStatus: Exclude<BounceStatus, "none"> }>;

type ReportBounceFormProps = Readonly<{ outreachMessageId: string; onClose: () => void; onSaved: () => void }>;

/** Marks a sent message as bounced: its delivery becomes failed and the bounce joins the prospect's timeline. */
export function ReportBounceForm({ outreachMessageId, onClose, onSaved }: ReportBounceFormProps) {
  const form = useForm<ReportBounceFormValues>({
    defaultValues: { bounceStatus: "hard" },
    resolver: commandResolver(logBounceInputSchema, ({ bounceStatus }) => ({ outreachMessageId, bounceStatus }), ["bounceStatus"])
  });
  const mutation = useLogBounce();

  const submit = form.handleSubmit(async ({ bounceStatus }) => {
    await mutation.mutateAsync({ outreachMessageId, bounceStatus });
    onSaved();
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((error: unknown) => markInvalidFields(form, error));

  return (
    <FormDialog error={mutation.error ? describeError(mutation.error, "message") : null} onClose={onClose} onSubmit={onSubmit} submitLabel="Report bounce" submitting={mutation.isPending} title="Report a bounce">
      <SelectField control={form.control} helperText="Hard: the address does not exist. Soft: a temporary problem such as a full mailbox. Blocked: the server refused it." label="Kind of bounce" name="bounceStatus" options={bounceOptions} />
    </FormDialog>
  );
}
