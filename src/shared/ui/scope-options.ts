import type { RecordScope } from "@/shared/api/field-schemas";
import type { FilterOption } from "@/shared/ui/FilterSelect";

export const scopeOptions = [{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }] as const satisfies readonly (FilterOption & { value: RecordScope })[];

/** Narrows a select's string to a scope, so a stale value can never reach the URL. */
export const toScope = (value: string): RecordScope => (value === "archived" ? "archived" : "active");
