"use client";

import type { BaseSyntheticEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { createFollowUpInputSchema } from "@/modules/followups/domain/followup.schema";
import { useCreateFollowUp } from "@/modules/followups/ui/use-followup-mutations";
import { prospectStatusChangeSchema } from "@/modules/prospects/domain/prospect.schema";
import type { ProspectStatus, StructuralReason } from "@/modules/prospects/domain/prospect.types";
import { prospectStatusMeta, structuralReasonLabel } from "@/modules/prospects/ui/prospect-presentation";
import { useUpdateProspectStatus } from "@/modules/prospects/ui/use-prospect-mutations";
import { describeError } from "@/shared/api/error-copy";
import { prospectStatusValues, structuralReasonValues } from "@/shared/db/schema/crm-values";
import { combineResolvers } from "@/shared/ui/form/combine-resolvers";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { SelectField, TextInputField } from "@/shared/ui/form/fields";
import { blankToUndefined } from "@/shared/ui/form/form-values";
import { fromDateTimeLocalValue } from "@/shared/lib/format-date";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

const statusOptions = prospectStatusValues.map((value) => ({ value, label: prospectStatusMeta[value].label }));
const reasonOptions = structuralReasonValues.map((value) => ({ value, label: structuralReasonLabel[value] }));

type StatusFormValues = Readonly<{
  status: ProspectStatus;
  structuralReason: StructuralReason | "";
  /** A `datetime-local` value. Only offered when going dormant: a timing-only "no" is dormant plus a date to revisit. */
  followUpAt: string;
  followUpReason: string;
}>;

const defaultValues = (status: ProspectStatus): StatusFormValues => ({ status, structuralReason: "", followUpAt: "", followUpReason: "Revisit" });

/** The reason only travels with a disqualification: leaving that status drops whatever was chosen. */
function toStatusInput({ status: next, structuralReason }: StatusFormValues) {
  return { status: next, ...(next === "disqualified" && structuralReason ? { structuralReason } : {}) };
}

/** The follow-up that goes with going dormant, or nothing when no date was chosen. */
function toFollowUpInput(values: StatusFormValues, prospectId: string) {
  const dueAt = fromDateTimeLocalValue(values.followUpAt);
  return values.status === "dormant" && dueAt ? { prospectId, reason: blankToUndefined(values.followUpReason), dueAt } : undefined;
}

type ProspectStatusDialogProps = Readonly<{ prospectId: string; status: ProspectStatus; onClose: () => void }>;

/** Moves a prospect to another status. Disqualifying also needs the structural reason, which the schema requires and the form asks for. */
export function ProspectStatusDialog({ prospectId, status, onClose }: ProspectStatusDialogProps) {
  const mutation = useUpdateProspectStatus();
  const followUp = useCreateFollowUp();
  const form = useForm<StatusFormValues>({
    defaultValues: defaultValues(status),
    resolver: combineResolvers(
      commandResolver<StatusFormValues>(prospectStatusChangeSchema, toStatusInput, ["status", "structuralReason"]),
      // The schema names its fields `dueAt` and `reason`; the form holds them as `followUpAt` and `followUpReason`.
      commandResolver<StatusFormValues>(createFollowUpInputSchema.optional(), (values) => toFollowUpInput(values, prospectId), ["followUpAt", "followUpReason"], { dueAt: "followUpAt", reason: "followUpReason" })
    )
  });
  const selected = useWatch({ control: form.control, name: "status" });
  const failure = mutation.error ?? followUp.error;

  const submit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync({ prospectId, ...toStatusInput(values) });
    // Two commands in turn. If the follow-up fails, the status stays changed and a retry only adds the follow-up.
    const followUpInput = toFollowUpInput(values, prospectId);
    if (followUpInput) await followUp.mutateAsync(createFollowUpInputSchema.parse(followUpInput));
    onClose();
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((failed: unknown) => markInvalidFields(form, failed));

  return (
    <FormDialog error={failure ? describeError(failure, "prospect") : null} onClose={onClose} onSubmit={onSubmit} submitDisabled={selected === status} submitLabel="Change status" submitting={mutation.isPending || followUp.isPending} title="Change status">
      <SelectField control={form.control} label="Status" name="status" options={statusOptions} />
      {selected === "disqualified" ? <SelectField control={form.control} emptyLabel="Choose a reason" helperText="Why this can't work, apart from timing. For a timing-only no, use Dormant." label="Reason" name="structuralReason" options={reasonOptions} /> : null}
      {selected === "dormant" ? (
        <>
          <TextInputField control={form.control} helperText="Optional. Adds a follow-up so you remember to revisit." label="Follow up on" name="followUpAt" type="datetime-local" />
          <TextInputField control={form.control} label="Reason for the follow-up" maxLength={500} name="followUpReason" />
        </>
      ) : null}
    </FormDialog>
  );
}
