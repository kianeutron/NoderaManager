"use client";

import { Box } from "@mui/material";
import { useState, type BaseSyntheticEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { logInteractionInputSchema, loggableInteractionTypes } from "@/modules/interactions/domain/interaction.schema";
import type { InteractionChannel } from "@/modules/interactions/domain/interaction.types";
import { emptyInteractionForm, fixedDirectionOf, toLogInteractionInput, type InteractionFormValues, type LoggableInteractionType } from "@/modules/interactions/ui/interaction-form";
import { directionLabel, interactionChannelLabel, interactionTypeLabel, responseDepthOptions, sentimentLabel } from "@/modules/interactions/ui/interaction-presentation";
import { useLogInteraction } from "@/modules/interactions/ui/use-interaction-mutations";
import { describeError } from "@/shared/api/error-copy";
import { interactionDirectionValues, outreachChannelValues, sentimentValues } from "@/shared/db/schema/crm-values";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { SelectField, TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

const typeOptions = loggableInteractionTypes.map((value) => ({ value, label: interactionTypeLabel[value] }));
const directionOptions = interactionDirectionValues.map((value) => ({ value, label: directionLabel[value] }));
const channelOptions = outreachChannelValues.map((value) => ({ value, label: interactionChannelLabel[value] }));
const sentimentOptions = sentimentValues.map((value) => ({ value, label: sentimentLabel[value] }));
const fieldNames = ["type", "direction", "channel", "occurredAt", "subject", "body", "responseDepth", "sentiment"];

type LogInteractionFormProps = Readonly<{
  prospectId: string;
  /** The message this answers, when it is about one. */
  outreachMessageId?: string;
  initialType: LoggableInteractionType;
  initialChannel: InteractionChannel;
  onClose: () => void;
  onSaved: () => void;
}>;

/** Records something that already happened with a prospect: their reply, a call, a meeting, a follow-up we sent. */
export function LogInteractionForm({ prospectId, outreachMessageId, initialType, initialChannel, onClose, onSaved }: LogInteractionFormProps) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const context = { prospectId, outreachMessageId, idempotencyKey };
  const form = useForm<InteractionFormValues>({
    defaultValues: emptyInteractionForm(new Date(), initialType, initialChannel),
    resolver: commandResolver(logInteractionInputSchema, (values) => toLogInteractionInput(values, context), fieldNames)
  });
  const mutation = useLogInteraction();

  const type = useWatch({ control: form.control, name: "type" });
  const direction = useWatch({ control: form.control, name: "direction" });
  const fixedDirection = fixedDirectionOf(type);
  const isReceived = (fixedDirection ?? direction) === "inbound";

  const submit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(logInteractionInputSchema.parse(toLogInteractionInput(values, context)));
    onSaved();
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((error: unknown) => markInvalidFields(form, error));

  return (
    <FormDialog error={mutation.error ? describeError(mutation.error, "prospect") : null} onClose={onClose} onSubmit={onSubmit} submitLabel="Save" submitting={mutation.isPending} title="Log interaction">
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <SelectField control={form.control} label="What happened" name="type" options={typeOptions} />
        {fixedDirection === null ? <SelectField control={form.control} label="Who started it" name="direction" options={directionOptions} /> : null}
        <SelectField control={form.control} label="Channel" name="channel" options={channelOptions} />
        <TextInputField control={form.control} helperText="When it happened" label="When" name="occurredAt" type="datetime-local" />
      </Box>
      <TextInputField control={form.control} label="Subject (optional)" maxLength={300} name="subject" />
      <TextInputField control={form.control} helperText="What was said, or your notes" label="Details" maxLength={20000} multiline name="body" />
      {isReceived ? <SelectField control={form.control} emptyLabel="Not classified" helperText="How far their response went. Set only when you know." label="Response depth" name="responseDepth" options={responseDepthOptions} /> : null}
      <SelectField control={form.control} emptyLabel="Not set" label="Sentiment" name="sentiment" options={sentimentOptions} />
    </FormDialog>
  );
}
