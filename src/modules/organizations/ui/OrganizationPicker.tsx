"use client";

import { Autocomplete, TextField } from "@mui/material";
import { useState } from "react";
import { useOrganizationList } from "@/modules/organizations/ui/use-organization-queries";
import { useDebouncedInput } from "@/shared/lib/use-debounced-input";
import { mergeKeysetPages } from "@/shared/lib/merge-keyset-pages";

export type OrganizationChoice = Readonly<{ id: string; name: string }>;

type OrganizationPickerProps = Readonly<{ value: OrganizationChoice | null; onChange: (value: OrganizationChoice | null) => void; label?: string; helperText?: string }>;

/** Type to search companies by name or domain; the chosen one stays selected even when a later search no longer lists it. */
export function OrganizationPicker({ value, onChange, label = "Company", helperText }: OrganizationPickerProps) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useDebouncedInput(search, setSearch);
  const query = useOrganizationList({ q: search.trim() || undefined, organizationType: undefined, sort: "name", scope: "active" });
  const options: OrganizationChoice[] = query.data ? mergeKeysetPages(query.data.pages).items.map(({ id, name }) => ({ id, name })) : [];

  return (
    <Autocomplete
      filterOptions={(all) => all}
      getOptionKey={(option) => option.id}
      getOptionLabel={(option) => option.name}
      inputValue={draft}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      loading={query.isFetching}
      onChange={(_event, next) => onChange(next)}
      onInputChange={(_event, next, reason) => { if (reason !== "reset") setDraft(next); }}
      options={options}
      renderInput={(params) => <TextField {...params} helperText={helperText} label={label} placeholder="Search companies" slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps?.inputLabel, shrink: true } }} />}
      value={value}
    />
  );
}
