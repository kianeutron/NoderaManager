import { organizationTypeValues } from "@/shared/db/schema/crm-values";
import { organizationTypeLabel } from "@/modules/organizations/ui/organization-presentation";
import type { PeopleWorkspace } from "@/modules/people/ui/use-people-workspace";
import { FilterSelect } from "@/shared/ui/FilterSelect";
import { scopeOptions, toScope } from "@/shared/ui/scope-options";
import { Stack } from "@mui/material";

const typeOptions = organizationTypeValues.map((value) => ({ value, label: organizationTypeLabel[value] }));
const sortOptions = [{ value: "updated", label: "Recently updated" }, { value: "name", label: "Name A–Z" }];

export function OrganizationFilterBar({ workspace }: Readonly<{ workspace: PeopleWorkspace }>) {
  const { state, setFilters } = workspace;

  return (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
      <FilterSelect allLabel="All types" label="Type" onChange={(value) => setFilters({ organizationType: typeOptions.find((option) => option.value === value)?.value })} options={typeOptions} value={state.organizationType ?? ""} />
      <FilterSelect label="Show" onChange={(value) => setFilters({ scope: toScope(value) })} options={scopeOptions} value={state.scope} />
      <FilterSelect label="Sort by" onChange={(value) => setFilters({ sort: value === "name" ? "name" : "updated" })} options={sortOptions} value={state.sort} />
    </Stack>
  );
}
