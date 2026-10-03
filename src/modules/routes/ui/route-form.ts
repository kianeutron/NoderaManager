import type { RouteOverview, RouteModuleOverview } from "@/modules/routes/domain/route.types";
import { blankToUndefined, definedEntries, diffText } from "@/shared/ui/form/form-values";

export type RouteFormValues = Readonly<{ name: string; description: string; /** A whole number; lower ones come first. Empty means 0 when adding. */ sortOrder: string }>;
export const emptyRouteForm: RouteFormValues = { name: "", description: "", sortOrder: "" };

export const routeToFormValues = (route: RouteOverview): RouteFormValues => ({ name: route.name, description: route.description ?? "", sortOrder: String(route.sortOrder) });

/** An empty or unreadable order is not a number; the schema then says so, instead of quietly becoming 0. */
const toOrder = (value: string): number | undefined => (value.trim() === "" ? undefined : Number(value));

export function toCreateRouteInput(values: RouteFormValues): Record<string, unknown> {
  return definedEntries({ name: values.name, description: blankToUndefined(values.description), sortOrder: toOrder(values.sortOrder) });
}

/** Only what differs from the saved route; `null` clears the description. */
export function toRouteChanges(values: RouteFormValues, initial: RouteFormValues): Record<string, unknown> {
  return definedEntries({
    name: values.name.trim() === initial.name ? undefined : values.name,
    description: diffText(values.description, initial.description),
    sortOrder: values.sortOrder.trim() === initial.sortOrder ? undefined : toOrder(values.sortOrder)
  });
}

export type ModuleFormValues = Readonly<{ name: string; description: string }>;
export const emptyModuleForm: ModuleFormValues = { name: "", description: "" };

export const moduleToFormValues = (routeModule: RouteModuleOverview): ModuleFormValues => ({ name: routeModule.name, description: routeModule.description ?? "" });

export function toCreateModuleInput(values: ModuleFormValues): Record<string, unknown> {
  return definedEntries({ name: values.name, description: blankToUndefined(values.description) });
}

export function toModuleChanges(values: ModuleFormValues, initial: ModuleFormValues): Record<string, unknown> {
  return definedEntries({ name: values.name.trim() === initial.name ? undefined : values.name, description: diffText(values.description, initial.description) });
}
