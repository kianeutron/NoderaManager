"use client";

import { ToggleButton, ToggleButtonGroup } from "@mui/material";

type RangeToggleProps<Value extends string> = Readonly<{
  label: string;
  options: readonly Value[];
  labels: Readonly<Record<Value, string>>;
  value: Value;
  onChange: (value: Value) => void;
}>;

/** A row of exclusive choices, such as a time window. Pressing the chosen one again keeps it chosen. */
export function RangeToggle<Value extends string>({ label, options, labels, value, onChange }: RangeToggleProps<Value>) {
  return (
    <ToggleButtonGroup aria-label={label} exclusive fullWidth onChange={(_event, next: Value | null) => { if (next) onChange(next); }} size="small" value={value}>
      {options.map((option) => <ToggleButton key={option} sx={{ px: 2, textTransform: "none" }} value={option}>{labels[option]}</ToggleButton>)}
    </ToggleButtonGroup>
  );
}
