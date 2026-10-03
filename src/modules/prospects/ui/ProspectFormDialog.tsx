"use client";

import { Box } from "@mui/material";
import { useEffect, useMemo, type BaseSyntheticEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouteCatalog } from "@/modules/routes/ui/use-route-queries";
import { createProspectInputSchema } from "@/modules/prospects/domain/prospect.schema";
import type { ProspectDetail } from "@/modules/prospects/domain/prospect.types";
import { editProspectFormSchema, emptyProspectForm, prospectToFormValues, toCreateProspectInput, toProspectChanges, type ProspectFormValues, type ProspectSubject } from "@/modules/prospects/ui/prospect-form";
import { prospectStatusMeta, sourceLabel, startingStatuses, temperatureLabel } from "@/modules/prospects/ui/prospect-presentation";
import { useCreateProspect, useUpdateProspect } from "@/modules/prospects/ui/use-prospect-mutations";
import { describeError } from "@/shared/api/error-copy";
import { prospectSourceValues, prospectTemperatureValues } from "@/shared/db/schema/crm-values";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { SelectField, TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

const statusOptions = startingStatuses.map((value) => ({ value, label: prospectStatusMeta[value].label }));
const temperatureOptions = prospectTemperatureValues.map((value) => ({ value, label: temperatureLabel[value] }));
const sourceOptions = prospectSourceValues.map((value) => ({ value, label: sourceLabel[value] }));
const fieldNames = Object.keys(emptyProspectForm);

type ProspectFormDialogProps = Readonly<{
  /** Who a new prospect is about; absent when editing. */
  subject?: ProspectSubject;
  /** Names the person or company in the title when adding. */
  subjectLabel?: string;
  /** Absent when adding. */
  prospect?: ProspectDetail;
  onClose: () => void;
  onSaved: () => void;
}>;

export function ProspectFormDialog({ subject, subjectLabel, prospect, onClose, onSaved }: ProspectFormDialogProps) {
  const initial = prospect ? prospectToFormValues(prospect) : emptyProspectForm;
  const form = useForm<ProspectFormValues>({
    defaultValues: initial,
    resolver: prospect
      ? commandResolver(editProspectFormSchema, (values) => toProspectChanges(values, initial), fieldNames)
      : commandResolver(createProspectInputSchema, (values) => toCreateProspectInput(values, subject ?? {}), fieldNames)
  });
  const catalog = useRouteCatalog();
  const create = useCreateProspect();
  const update = useUpdateProspect();
  const pending = create.isPending || update.isPending;
  const failure = create.error ?? update.error ?? catalog.error;
  const error = failure ? describeError(failure, "prospect") : form.formState.errors.root?.message ?? null;

  const routeId = useWatch({ control: form.control, name: "routeId" });
  const modules = useMemo(() => catalog.data?.find((route) => route.id === routeId)?.modules ?? [], [catalog.data, routeId]);
  const moduleOptions = modules.map((module) => ({ value: module.id, label: module.name }));
  // A module belongs to one route, so choosing another route drops the module.
  useEffect(() => {
    if (form.getValues("routeModuleId") && !modules.some((module) => module.id === form.getValues("routeModuleId"))) form.setValue("routeModuleId", "", { shouldDirty: true });
  }, [form, modules]);

  const submit = form.handleSubmit(async (values) => {
    if (prospect) {
      const changes = toProspectChanges(values, initial);
      if (Object.keys(changes).length > 0) await update.mutateAsync({ prospectId: prospect.id, changes });
    } else {
      await create.mutateAsync(createProspectInputSchema.parse(toCreateProspectInput(values, subject ?? {})));
    }
    onSaved();
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((failed: unknown) => markInvalidFields(form, failed));

  return (
    <FormDialog error={error} onClose={onClose} onSubmit={onSubmit} submitDisabled={prospect !== undefined && !form.formState.isDirty} submitLabel={prospect ? "Save changes" : "Add prospect"} submitting={pending} title={prospect ? "Edit prospect" : `Add prospect${subjectLabel ? ` for ${subjectLabel}` : ""}`}>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <SelectField control={form.control} emptyLabel={catalog.isPending ? "Loading routes…" : "Choose a route"} label="Route" name="routeId" options={(catalog.data ?? []).map((route) => ({ value: route.id, label: route.name }))} />
        <SelectField control={form.control} emptyLabel="No module" label="Module" name="routeModuleId" options={moduleOptions} />
        {prospect ? null : <SelectField control={form.control} label="Starts as" name="status" options={statusOptions} />}
        <SelectField control={form.control} emptyLabel="Not set" label="Temperature" name="temperature" options={temperatureOptions} />
        <SelectField control={form.control} emptyLabel="Not set" label="Source" name="source" options={sourceOptions} />
      </Box>
      <TextInputField control={form.control} helperText="Why this person or company fits the route." label="Why targeted" maxLength={2000} multiline name="whyTargeted" />
      <TextInputField control={form.control} helperText="What makes now a good time." label="Current trigger" maxLength={500} name="currentTrigger" />
      <TextInputField control={form.control} label="Next action" maxLength={500} name="nextAction" />
    </FormDialog>
  );
}
