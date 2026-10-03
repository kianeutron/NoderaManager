"use client";

import type { BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { moduleChangesSchema, routeModuleBodySchema } from "@/modules/routes/domain/route.schema";
import type { RouteModuleOverview } from "@/modules/routes/domain/route.types";
import { emptyModuleForm, moduleToFormValues, toCreateModuleInput, toModuleChanges, type ModuleFormValues } from "@/modules/routes/ui/route-form";
import { useCreateRouteModule, useUpdateRouteModule } from "@/modules/routes/ui/use-route-mutations";
import { describeError } from "@/shared/api/error-copy";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

const fieldNames = Object.keys(emptyModuleForm);

type ModuleFormProps = Readonly<{
  routeId: string;
  /** Absent when adding. */
  module?: RouteModuleOverview;
  onClose: () => void;
  onSaved: () => void;
}>;

/** A module is a narrower tactic inside a route. */
export function ModuleForm({ routeId, module: routeModule, onClose, onSaved }: ModuleFormProps) {
  const initial = routeModule ? moduleToFormValues(routeModule) : emptyModuleForm;
  const form = useForm<ModuleFormValues>({
    defaultValues: initial,
    resolver: routeModule
      ? commandResolver(moduleChangesSchema, (values) => toModuleChanges(values, initial), fieldNames)
      : commandResolver(routeModuleBodySchema, toCreateModuleInput, fieldNames)
  });
  const create = useCreateRouteModule();
  const update = useUpdateRouteModule();
  const failure = create.error ?? update.error;
  const error = failure ? describeError(failure, "module") : form.formState.errors.root?.message ?? null;

  const submit = form.handleSubmit(async (values) => {
    if (routeModule) await update.mutateAsync({ routeModuleId: routeModule.id, changes: moduleChangesSchema.parse(toModuleChanges(values, initial)) });
    else await create.mutateAsync({ routeId, input: routeModuleBodySchema.parse(toCreateModuleInput(values)) });
    onSaved();
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((failed: unknown) => markInvalidFields(form, failed));

  return (
    <FormDialog error={error} onClose={onClose} onSubmit={onSubmit} submitDisabled={routeModule !== undefined && !form.formState.isDirty} submitLabel={routeModule ? "Save changes" : "Add module"} submitting={create.isPending || update.isPending} title={routeModule ? "Edit module" : "Add module"}>
      <TextInputField autoFocus control={form.control} label="Name" maxLength={120} name="name" />
      <TextInputField control={form.control} label="Description" maxLength={1000} multiline name="description" />
    </FormDialog>
  );
}
