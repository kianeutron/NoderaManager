"use client";

import { Box } from "@mui/material";
import { useMemo, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { campaignChangesSchema, createCampaignInputSchema } from "@/modules/campaigns/domain/campaign.schema";
import type { CampaignDetail } from "@/modules/campaigns/domain/campaign.types";
import { campaignToFormValues, emptyCampaignForm, mergeChoices, routeChoicesOf, toCampaignChanges, toCampaignEditValidationInput, toCreateCampaignInput, toRouteChoices, toRoutesChange, type CampaignFormValues } from "@/modules/campaigns/ui/campaign-form";
import { useCreateCampaign, useUpdateCampaign } from "@/modules/campaigns/ui/use-campaign-mutations";
import { organizationTypeLabel } from "@/modules/organizations/ui/organization-presentation";
import { personaLabel } from "@/modules/people/ui/person-presentation";
import { useRouteCatalog } from "@/modules/routes/ui/use-route-queries";
import { describeError } from "@/shared/api/error-copy";
import { organizationTypeValues, personaValues } from "@/shared/db/schema/crm-values";
import { commandResolver } from "@/shared/ui/form/command-resolver";
import { MultiSelectField, TagsField, TextInputField } from "@/shared/ui/form/fields";
import { FormDialog } from "@/shared/ui/form/FormDialog";
import { markInvalidFields } from "@/shared/ui/form/server-field-errors";

const personaOptions = personaValues.map((value) => ({ value, label: personaLabel[value] }));
const organizationTypeOptions = organizationTypeValues.map((value) => ({ value, label: organizationTypeLabel[value] }));
const fieldNames = Object.keys(emptyCampaignForm);

type CampaignFormProps = Readonly<{
  /** Absent when adding. */
  campaign?: CampaignDetail;
  onClose: () => void;
  onSaved: (campaignId: string) => void;
}>;

/** A bounded initiative: a goal, a time window, the routes it works and who it is for. The targeting only suggests prospects; it never adds them. */
export function CampaignForm({ campaign, onClose, onSaved }: CampaignFormProps) {
  const initial = campaign ? campaignToFormValues(campaign) : emptyCampaignForm;
  const form = useForm<CampaignFormValues>({
    defaultValues: initial,
    resolver: campaign
      ? commandResolver(campaignChangesSchema, (values) => toCampaignEditValidationInput(values, initial), fieldNames)
      : commandResolver(createCampaignInputSchema, toCreateCampaignInput, fieldNames)
  });
  const catalog = useRouteCatalog();
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const failure = create.error ?? update.error ?? catalog.error;
  const error = failure ? describeError(failure, "campaign") : form.formState.errors.root?.message ?? null;
  // The catalog lists active routes; a campaign may still work one that was archived since, and keeps its name here.
  const routeChoices = useMemo(() => mergeChoices(toRouteChoices(catalog.data ?? []), campaign ? routeChoicesOf(campaign.routes) : []), [catalog.data, campaign]);

  const submit = form.handleSubmit(async (values) => {
    if (campaign) {
      const changes = toCampaignChanges(values, initial);
      const routes = toRoutesChange(values, initial);
      if (Object.keys(changes).length > 0 || routes) await update.mutateAsync({ campaignId: campaign.id, changes: Object.keys(changes).length > 0 ? campaignChangesSchema.parse(changes) : null, routes });
      onSaved(campaign.id);
      return;
    }
    const result = await create.mutateAsync(createCampaignInputSchema.parse(toCreateCampaignInput(values)));
    onSaved(result.campaignId);
  });

  // The mutation state already carries the notice; only fields the server rejected still need marking.
  const onSubmit = (event: BaseSyntheticEvent) => void submit(event).catch((failed: unknown) => markInvalidFields(form, failed));

  return (
    <FormDialog error={error} onClose={onClose} onSubmit={onSubmit} submitDisabled={campaign !== undefined && !form.formState.isDirty} submitLabel={campaign ? "Save changes" : "Add campaign"} submitting={create.isPending || update.isPending} title={campaign ? "Edit campaign" : "Add campaign"}>
      <TextInputField autoFocus control={form.control} label="Name" maxLength={120} name="name" />
      <TextInputField control={form.control} helperText="What this campaign is meant to achieve." label="Goal" maxLength={1000} multiline name="goal" />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <TextInputField control={form.control} label="Starts" name="startsAt" type="datetime-local" />
        <TextInputField control={form.control} label="Ends" name="endsAt" type="datetime-local" />
      </Box>
      <MultiSelectField control={form.control} helperText="A route alone covers all its modules. Pick a module to narrow it." label="Routes it works" name="routes" options={routeChoices} />
      <MultiSelectField control={form.control} helperText="Who it is for. Only used to suggest prospects to add." label="Personas" name="personas" options={personaOptions} />
      <MultiSelectField control={form.control} label="Company types" name="organizationTypes" options={organizationTypeOptions} />
      <TagsField control={form.control} helperText="Two-letter ISO codes such as DE. Press Enter after each." label="Countries" name="countries" placeholder="DE" />
    </FormDialog>
  );
}
