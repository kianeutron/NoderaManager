import CloseRounded from "@mui/icons-material/CloseRounded";
import { Chip, Stack } from "@mui/material";
import { personaValues } from "@/shared/db/schema/crm-values";
import { personaLabel } from "@/modules/people/ui/person-presentation";
import type { PeopleWorkspace } from "@/modules/people/ui/use-people-workspace";
import { FilterSelect } from "@/shared/ui/FilterSelect";
import { scopeOptions, toScope } from "@/shared/ui/scope-options";

const personaOptions = personaValues.map((value) => ({ value, label: personaLabel[value] }));
const sortOptions = [{ value: "updated", label: "Recently updated" }, { value: "name", label: "Name A–Z" }];

export function PeopleFilterBar({ workspace }: Readonly<{ workspace: PeopleWorkspace }>) {
  const { state, setFilters } = workspace;

  return (
    <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
      <FilterSelect allLabel="All personas" label="Persona" onChange={(value) => setFilters({ persona: personaOptions.find((option) => option.value === value)?.value })} options={personaOptions} value={state.persona ?? ""} />
      <FilterSelect label="Show" onChange={(value) => setFilters({ scope: toScope(value) })} options={scopeOptions} value={state.scope} />
      <FilterSelect label="Sort by" onChange={(value) => setFilters({ sort: value === "name" ? "name" : "updated" })} options={sortOptions} value={state.sort} />
      {state.organizationId ? <Chip color="primary" deleteIcon={<CloseRounded />} label="Filtered by company" onDelete={() => setFilters({ organizationId: undefined })} variant="outlined" /> : null}
    </Stack>
  );
}
