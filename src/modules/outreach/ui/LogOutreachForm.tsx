"use client";

import { Box } from "@mui/material";
import { useState, type BaseSyntheticEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useProspectCampaigns } from "@/modules/campaigns/ui/use-campaign-queries";
import { logOutreachInputSchema } from "@/modules/outreach/domain/outreach.schema";
import { emptyOutreachForm, toLogOutreachInput, type OutreachFormValues } from "@/modules/outreach/ui/outreach-form";
import { channelLabel } from "@/modules/outreach/ui/outreach-presentation";
import { OutreachTargetPicker } from "@/modules/outreach/ui/OutreachTargetPicker";
import { useLogOutreach } from "@/modules/outreach/ui/use-outreach-mutations";
import { describeError } from "@/shared/api/error-copy";
import { outreachChannelValues } from "@/shared/db/schema/crm-values";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { SelectField, TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

const channelOptions = outreachChannelValues.map((value) => ({ value, label: channelLabel[value] }));
const fieldNames = ["target", "campaignId", "channel", "sentAt", "subject", "body"];
// The command names the field `prospectId`; the form holds the whole target, so that issue belongs to the picker.
const renames = { prospectId: "target" } as const;

type LogOutreachFormProps = Readonly<{ onClose: () => void; onSaved: (messageId: string) => void }>;

/** Records a message that was already sent (by the owner or an assistant) against a prospect. */
export function LogOutreachForm({ onClose, onSaved }: LogOutreachFormProps) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const form = useForm<OutreachFormValues>({
    defaultValues: emptyOutreachForm(new Date()),
    resolver: commandResolver(logOutreachInputSchema, (values) => toLogOutreachInput(values, idempotencyKey), fieldNames, renames)
  });
  const mutation = useLogOutreach();
  const target = useWatch({ control: form.control, name: "target" });
  const campaigns = useProspectCampaigns(target?.prospectId ?? null);
  const campaignOptions = (campaigns.data ?? []).map((campaign) => ({ value: campaign.id, label: campaign.name }));

  const submit = form.handleSubmit(async (values) => {
    const result = await mutation.mutateAsync(logOutreachInputSchema.parse(toLogOutreachInput(values, idempotencyKey)));
    onSaved(result.messageId);
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((error: unknown) => markInvalidFields(form, error));

  return (
    <FormDialog error={mutation.error ? describeError(mutation.error, "prospect") : null} onClose={onClose} onSubmit={onSubmit} submitLabel="Save outreach" submitting={mutation.isPending} title="Log outreach">
      <Controller control={form.control} name="target" render={({ field }) => <OutreachTargetPicker error={form.formState.errors.target?.message ?? form.formState.errors.root?.message} onChange={(next) => { field.onChange(next); form.setValue("campaignId", ""); }} value={field.value} />} />
      {campaignOptions.length > 0 ? <SelectField control={form.control} emptyLabel="No campaign" helperText="The active campaigns this prospect is part of." label="Campaign" name="campaignId" options={campaignOptions} /> : null}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <SelectField control={form.control} label="Channel" name="channel" options={channelOptions} />
        <TextInputField control={form.control} helperText="When you sent it" label="Sent" name="sentAt" type="datetime-local" />
      </Box>
      <TextInputField control={form.control} label="Subject (optional)" maxLength={300} name="subject" />
      <TextInputField control={form.control} helperText="What did you send?" label="Message" maxLength={20000} multiline name="body" />
    </FormDialog>
  );
}
