"use client";

import type { BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { createRouteInputSchema, routeChangesSchema } from "@/modules/routes/domain/route.schema";
import type { RouteOverview } from "@/modules/routes/domain/route.types";
import { emptyRouteForm, routeToFormValues, toCreateRouteInput, toRouteChanges, type RouteFormValues } from "@/modules/routes/ui/route-form";
import { useCreateRoute, useUpdateRoute } from "@/modules/routes/ui/use-route-mutations";
import { describeError } from "@/shared/api/error-copy";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

const fieldNames = Object.keys(emptyRouteForm);

type RouteFormProps = Readonly<{
  /** Absent when adding. */
  route?: RouteOverview;
  onClose: () => void;
  onSaved: (routeId: string) => void;
}>;

/** A route is an acquisition strategy (Agency Overflow, Recruiters), not a channel. The order sets where it sits in lists. */
export function RouteForm({ route, onClose, onSaved }: RouteFormProps) {
  const initial = route ? routeToFormValues(route) : emptyRouteForm;
  const form = useForm<RouteFormValues>({
    defaultValues: initial,
    resolver: route
      ? commandResolver(routeChangesSchema, (values) => toRouteChanges(values, initial), fieldNames)
      : commandResolver(createRouteInputSchema, toCreateRouteInput, fieldNames)
  });
  const create = useCreateRoute();
  const update = useUpdateRoute();
  const failure = create.error ?? update.error;
  const error = failure ? describeError(failure, "route") : form.formState.errors.root?.message ?? null;

  const submit = form.handleSubmit(async (values) => {
    if (route) {
      await update.mutateAsync({ routeId: route.id, changes: routeChangesSchema.parse(toRouteChanges(values, initial)) });
      onSaved(route.id);
      return;
    }
    const result = await create.mutateAsync(createRouteInputSchema.parse(toCreateRouteInput(values)));
    onSaved(result.routeId);
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((failed: unknown) => markInvalidFields(form, failed));

  return (
    <FormDialog error={error} onClose={onClose} onSubmit={onSubmit} submitDisabled={route !== undefined && !form.formState.isDirty} submitLabel={route ? "Save changes" : "Add route"} submitting={create.isPending || update.isPending} title={route ? "Edit route" : "Add route"}>
      <TextInputField autoFocus control={form.control} label="Name" maxLength={120} name="name" />
      <TextInputField control={form.control} helperText="Who this route is for and how it works." label="Description" maxLength={1000} multiline name="description" />
      <TextInputField control={form.control} helperText="A whole number. Lower ones come first in lists." label="Order" name="sortOrder" />
    </FormDialog>
  );
}
