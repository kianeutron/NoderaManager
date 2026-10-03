"use client";

import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import type { BaseSyntheticEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { PersonLinksField } from "@/modules/people/ui/PersonLinksField";
import { OrganizationPicker } from "@/modules/organizations/ui/OrganizationPicker";
import { createPersonInputSchema } from "@/modules/people/domain/person.schema";
import type { DuplicateCandidate, PersonDetail } from "@/modules/people/domain/person.types";
import { DuplicateWarning } from "@/modules/people/ui/DuplicateWarning";
import { createPersonFormSchema, editPersonFormSchema, emptyPersonForm, personToFormValues, toCreatePersonFormInput, toCreatePersonInput, toDuplicateCheckInput, toEditPersonInput, toLinkInputs, toPersonSubmission, type PersonFormValues } from "@/modules/people/ui/person-form";
import { personaLabel } from "@/modules/people/ui/person-presentation";
import { useCheckPersonDuplicates, useCreatePerson, useUpdatePerson } from "@/modules/people/ui/use-people-mutations";
import { describeError } from "@/shared/api/error-copy";
import { personaValues } from "@/shared/db/schema/crm-values";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { SelectField, TagsField, TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";

const personaOptions = personaValues.map((value) => ({ value, label: personaLabel[value] }));
const fieldNames = Object.keys(emptyPersonForm);

type PersonFormDialogProps = Readonly<{
  /** Absent when adding a person. */
  person?: PersonDetail;
  onClose: () => void;
  onSaved: (personId: string) => void;
  /** When adding: lets the owner jump to an existing person the duplicate check found. */
  onOpenPerson?: (personId: string) => void;
}>;

export function PersonFormDialog({ person, onClose, onSaved, onOpenPerson }: PersonFormDialogProps) {
  const initial = person ? personToFormValues(person) : emptyPersonForm;
  const form = useForm<PersonFormValues>({
    defaultValues: initial,
    resolver: person
      ? commandResolver(editPersonFormSchema, (values) => toEditPersonInput(values, initial), fieldNames)
      : commandResolver(createPersonFormSchema, toCreatePersonFormInput, fieldNames)
  });
  const create = useCreatePerson();
  const update = useUpdatePerson();
  const check = useCheckPersonDuplicates();
  const [duplicates, setDuplicates] = useState<readonly DuplicateCandidate[] | null>(null);
  const pending = create.isPending || update.isPending || check.isPending;
  const failure = create.error ?? update.error ?? check.error;
  const error = failure ? describeError(failure, "person") : form.formState.errors.root?.message ?? null;

  // Any edit invalidates a finished duplicate check.
  useEffect(() => form.subscribe({ formState: { values: true }, callback: () => setDuplicates(null) }), [form]);

  async function add(values: PersonFormValues, confirmNewIdentity: boolean) {
    const result = await create.mutateAsync({ input: createPersonInputSchema.parse(toCreatePersonInput(values, confirmNewIdentity)), links: toLinkInputs(values.links) });
    onSaved(result.personId);
  }

  const submit = form.handleSubmit(async (values) => {
    if (person) {
      const { changes, emails, links } = toPersonSubmission(values, initial);
      if (changes || emails || links) await update.mutateAsync({ personId: person.id, changes, emails, links });
      onSaved(person.id);
      return;
    }

    const identity = toDuplicateCheckInput(values);
    if (identity) {
      // Exact and strong matches stop the save; weaker ones are advisory and do not.
      const blocking = (await check.mutateAsync(identity)).filter((candidate) => candidate.matchLevel !== "weak");
      if (blocking.length > 0) { setDuplicates(blocking); return; }
    }
    await add(values, false);
  });

  const isExactMatch = duplicates?.some((candidate) => candidate.matchLevel === "exact") ?? false;

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((error: unknown) => markInvalidFields(form, error));

  return (
    <FormDialog error={error} onClose={onClose} onSubmit={onSubmit} submitDisabled={person !== undefined && !form.formState.isDirty} submitLabel={person ? "Save changes" : "Add person"} submitting={pending} title={person ? "Edit person" : "Add person"}>
      <TextInputField autoFocus control={form.control} label="Full name" maxLength={160} name="fullName" />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <TextInputField control={form.control} label="Role" maxLength={160} name="role" />
        <SelectField control={form.control} emptyLabel="Not set" label="Persona" name="persona" options={personaOptions} />
      </Box>
      <Controller
        control={form.control}
        name="organization"
        render={({ field }) => <OrganizationPicker onChange={field.onChange} value={field.value} />}
      />
      <TagsField control={form.control} helperText="Press Enter after each. The first is the primary address." label="Emails" name="emails" placeholder="name@example.com" />
      <TextInputField control={form.control} label="LinkedIn profile" name="linkedinUrl" placeholder="https://www.linkedin.com/in/…" />
      <PersonLinksField control={form.control} />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <TextInputField control={form.control} label="City" maxLength={120} name="city" />
        <TextInputField control={form.control} helperText="Two-letter ISO code, e.g. DE" label="Country" maxLength={2} name="countryCode" />
      </Box>
      <TagsField control={form.control} helperText="Two-letter codes, e.g. en, de" label="Languages" name="languages" placeholder="en" />
      {duplicates ? <DuplicateWarning candidates={duplicates} onCreateAnyway={isExactMatch ? null : () => void add(form.getValues(), true).catch((error: unknown) => markInvalidFields(form, error))} onOpen={(personId) => onOpenPerson?.(personId)} pending={pending} /> : null}
    </FormDialog>
  );
}
