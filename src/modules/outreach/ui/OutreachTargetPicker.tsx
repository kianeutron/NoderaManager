"use client";

import { Autocomplete, TextField } from "@mui/material";
import { useState } from "react";
import type { OutreachTarget } from "@/modules/outreach/domain/outreach.types";
import { useOutreachTargets } from "@/modules/outreach/ui/use-outreach-queries";
import { useDebouncedInput } from "@/shared/lib/use-debounced-input";

export const targetLabel = ({ personName, organizationName, routeName }: OutreachTarget): string =>
  `${[personName, organizationName].filter(Boolean).join(" · ") || "Unnamed prospect"} — ${routeName}`;

type OutreachTargetPickerProps = Readonly<{ value: OutreachTarget | null; onChange: (value: OutreachTarget | null) => void; error?: string | undefined }>;

/**
 * Type to find a prospect. The server only offers ones a message can go to (open, not archived, not do-not-contact), so a
 * refused choice is rare; the chosen one stays selected even when a later search no longer lists it.
 */
export function OutreachTargetPicker({ value, onChange, error }: OutreachTargetPickerProps) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useDebouncedInput(search, setSearch);
  const query = useOutreachTargets(search.trim() || undefined);

  return (
    <Autocomplete
      filterOptions={(all) => all}
      getOptionKey={(option) => option.prospectId}
      getOptionLabel={targetLabel}
      inputValue={draft}
      isOptionEqualToValue={(option, selected) => option.prospectId === selected.prospectId}
      loading={query.isFetching}
      noOptionsText={query.isError ? "Prospects could not be loaded" : "No matching prospects"}
      onChange={(_event, next) => onChange(next)}
      onInputChange={(_event, next, reason) => { if (reason !== "reset") setDraft(next); }}
      options={query.data ?? []}
      renderInput={(params) => <TextField {...params} error={error !== undefined} helperText={error} label="Prospect" placeholder="Search by person or company" slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps?.inputLabel, shrink: true } }} />}
      value={value}
    />
  );
}
