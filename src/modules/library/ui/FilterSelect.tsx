import { MenuItem, TextField } from "@mui/material";

export type FilterOption = Readonly<{ value: string; label: string; indent?: number }>;

type FilterSelectProps = Readonly<{
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
  /** When set, adds a leading option with an empty value that means "no filter". */
  allLabel?: string;
}>;

export function FilterSelect({ label, value, options, onChange, allLabel }: FilterSelectProps) {
  // A value the options do not contain (stale URL, facets still loading) would make MUI warn.
  const displayedValue = allLabel !== undefined && !options.some((option) => option.value === value) ? "" : value;

  return (
    <TextField label={label} onChange={(event) => onChange(event.target.value)} select size="small" slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ flex: { xs: "1 1 140px", sm: "0 0 auto" }, minWidth: { sm: 170 } }} value={displayedValue}>
      {allLabel !== undefined ? <MenuItem value="">{allLabel}</MenuItem> : null}
      {options.map((option) => (
        <MenuItem key={option.value} sx={{ pl: 2 + (option.indent ?? 0) * 1.5 }} value={option.value}>{option.label}</MenuItem>
      ))}
    </TextField>
  );
}
