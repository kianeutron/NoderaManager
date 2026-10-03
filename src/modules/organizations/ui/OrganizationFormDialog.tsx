"use client";

import { Box } from "@mui/material";
import { useEffect, useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { createOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";
import type { OrganizationDetail, SimilarOrganization } from "@/modules/organizations/domain/organization.types";
import { editOrganizationFormSchema, emptyOrganizationForm, organizationToFormValues, toCreateOrganizationInput, toEditOrganizationInput, toOrganizationSubmission, type OrganizationFormValues } from "@/modules/organizations/ui/organization-form";
import { organizationTypeLabel, sizeBandLabel } from "@/modules/organizations/ui/organization-presentation";
import { SimilarOrganizationsWarning } from "@/modules/organizations/ui/SimilarOrganizationsWarning";
import { useCheckSimilarOrganizations, useCreateOrganization, useUpdateOrganization } from "@/modules/organizations/ui/use-organization-mutations";
import { describeError } from "@/shared/api/error-copy";
import { organizationSizeBandValues, organizationTypeValues } from "@/shared/db/schema/crm-values";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { SelectField, TagsField, TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";

const typeOptions = organizationTypeValues.map((value) => ({ value, label: organizationTypeLabel[value] }));
const sizeOptions = organizationSizeBandValues.map((value) => ({ value, label: sizeBandLabel[value] }));
const fieldNames = Object.keys(emptyOrganizationForm);

type OrganizationFormDialogProps = Readonly<{
  /** Absent when adding a company. */
  organization?: OrganizationDetail;
  onClose: () => void;
  onSaved: (organizationId: string) => void;
  /** When adding: lets the owner jump to an existing company with the same name. */
  onOpenOrganization?: (organizationId: string) => void;
}>;

export function OrganizationFormDialog({ organization, onClose, onSaved, onOpenOrganization }: OrganizationFormDialogProps) {
  const initial = organization ? organizationToFormValues(organization) : emptyOrganizationForm;
  const form = useForm<OrganizationFormValues>({
    defaultValues: initial,
    resolver: organization
      ? commandResolver(editOrganizationFormSchema, (values) => toEditOrganizationInput(values, initial), fieldNames)
      : commandResolver(createOrganizationInputSchema, toCreateOrganizationInput, fieldNames)
  });
  const create = useCreateOrganization();
  const update = useUpdateOrganization();
  const check = useCheckSimilarOrganizations();
  const [similar, setSimilar] = useState<readonly SimilarOrganization[] | null>(null);
  const pending = create.isPending || update.isPending || check.isPending;
  const failure = create.error ?? update.error ?? check.error;
  const error = failure ? describeError(failure, "company") : form.formState.errors.root?.message ?? null;

  // Any edit invalidates a finished similarity check.
  useEffect(() => form.subscribe({ formState: { values: true }, callback: () => setSimilar(null) }), [form]);

  async function add(values: OrganizationFormValues) {
    const result = await create.mutateAsync(createOrganizationInputSchema.parse(toCreateOrganizationInput(values)));
    onSaved(result.organizationId);
  }

  const submit = form.handleSubmit(async (values) => {
    if (!organization) {
      const matches = await check.mutateAsync(values.name.trim());
      if (matches.length > 0) { setSimilar(matches); return; }
      await add(values);
      return;
    }
    const { changes, domains } = toOrganizationSubmission(values, initial);
    if (changes || domains) await update.mutateAsync({ organizationId: organization.id, changes, domains });
    onSaved(organization.id);
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((error: unknown) => markInvalidFields(form, error));

  return (
    <FormDialog error={error} onClose={onClose} onSubmit={onSubmit} submitDisabled={organization !== undefined && !form.formState.isDirty} submitLabel={organization ? "Save changes" : "Add company"} submitting={pending} title={organization ? "Edit company" : "Add company"}>
      <TextInputField autoFocus control={form.control} label="Name" maxLength={160} name="name" />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <SelectField control={form.control} label="Type" name="organizationType" options={typeOptions} />
        <SelectField control={form.control} emptyLabel="Not set" label="Size" name="sizeBand" options={sizeOptions} />
        <TextInputField control={form.control} label="Industry" maxLength={120} name="industry" />
        <TextInputField control={form.control} helperText="Two-letter ISO code, e.g. DE" label="Country" maxLength={2} name="countryCode" />
      </Box>
      <TagsField control={form.control} helperText="Press Enter after each. The first is the main domain." label="Domains" name="domains" placeholder="example.com" />
      <TextInputField control={form.control} label="Website" name="websiteUrl" placeholder="https://" />
      <TextInputField control={form.control} label="LinkedIn page" name="linkedinUrl" placeholder="https://www.linkedin.com/company/…" />
      <TextInputField control={form.control} label="About" maxLength={5000} multiline name="notes" />
      {similar ? <SimilarOrganizationsWarning onAddAnyway={() => void add(form.getValues()).catch((failed: unknown) => markInvalidFields(form, failed))} onOpen={(organizationId) => onOpenOrganization?.(organizationId)} organizations={similar} pending={pending} /> : null}
    </FormDialog>
  );
}
