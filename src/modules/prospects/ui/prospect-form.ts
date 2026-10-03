import { prospectFieldsSchema, type ProspectChanges } from "@/modules/prospects/domain/prospect.schema";
import type { ProspectDetail, ProspectSource, ProspectTemperature } from "@/modules/prospects/domain/prospect.types";
import { blankToUndefined, definedEntries, diffText } from "@/shared/ui/form/form-values";

export type ProspectFormValues = Readonly<{
  routeId: string;
  /** Empty means no module. */
  routeModuleId: string;
  status: "researched" | "ready";
  temperature: ProspectTemperature | "";
  source: ProspectSource | "";
  whyTargeted: string;
  currentTrigger: string;
  nextAction: string;
}>;

export const emptyProspectForm: ProspectFormValues = { routeId: "", routeModuleId: "", status: "researched", temperature: "", source: "", whyTargeted: "", currentTrigger: "", nextAction: "" };

export function prospectToFormValues(prospect: ProspectDetail): ProspectFormValues {
  return {
    routeId: prospect.route.id,
    routeModuleId: prospect.module?.id ?? "",
    // The status is not edited here: it has its own command.
    status: "researched",
    temperature: prospect.temperature ?? "",
    source: prospect.source ?? "",
    whyTargeted: prospect.whyTargeted ?? "",
    currentTrigger: prospect.currentTrigger ?? "",
    nextAction: prospect.nextAction ?? ""
  };
}

/** Who the prospect is about: a person, an organization, or both. */
export type ProspectSubject = Readonly<{ personId?: string; organizationId?: string }>;

export function toCreateProspectInput(values: ProspectFormValues, subject: ProspectSubject): unknown {
  return definedEntries({
    ...subject,
    routeId: blankToUndefined(values.routeId),
    routeModuleId: blankToUndefined(values.routeModuleId),
    status: values.status,
    temperature: values.temperature || undefined,
    source: values.source || undefined,
    whyTargeted: blankToUndefined(values.whyTargeted),
    currentTrigger: blankToUndefined(values.currentTrigger),
    nextAction: blankToUndefined(values.nextAction)
  });
}

/** Only what differs from the saved prospect; `null` clears a field. */
export function toProspectChanges(values: ProspectFormValues, initial: ProspectFormValues): ProspectChanges {
  return definedEntries({
    routeId: values.routeId === initial.routeId ? undefined : blankToUndefined(values.routeId),
    routeModuleId: values.routeModuleId === initial.routeModuleId ? undefined : values.routeModuleId || null,
    temperature: values.temperature === initial.temperature ? undefined : values.temperature || null,
    source: values.source === initial.source ? undefined : values.source || null,
    whyTargeted: diffText(values.whyTargeted, initial.whyTargeted),
    currentTrigger: diffText(values.currentTrigger, initial.currentTrigger),
    nextAction: diffText(values.nextAction, initial.nextAction)
  });
}

/** Edits validate the changed fields with the command rules, without demanding a change (Save is disabled until the form is dirty). */
export const editProspectFormSchema = prospectFieldsSchema;
