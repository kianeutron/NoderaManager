"use client";

import { Autocomplete, Box, Chip, MenuItem, TextField } from "@mui/material";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

type BaseProps<Values extends FieldValues> = Readonly<{ control: Control<Values>; name: Path<Values>; label: string; helperText?: string }>;

type TextInputFieldProps<Values extends FieldValues> = BaseProps<Values> & Readonly<{ multiline?: boolean; placeholder?: string; autoFocus?: boolean; maxLength?: number; type?: "text" | "datetime-local" }>;

export function TextInputField<Values extends FieldValues>({ control, name, label, helperText, multiline, placeholder, autoFocus, maxLength, type = "text" }: TextInputFieldProps<Values>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          autoFocus={autoFocus}
          error={fieldState.invalid}
          fullWidth
          helperText={fieldState.error?.message ?? helperText}
          label={label}
          minRows={multiline ? 3 : undefined}
          multiline={multiline}
          placeholder={placeholder}
          slotProps={{ htmlInput: { maxLength }, inputLabel: { shrink: true } }}
          type={type}
        />
      )}
    />
  );
}

export type SelectOption = Readonly<{ value: string; label: string }>;

type SelectFieldProps<Values extends FieldValues> = BaseProps<Values> & Readonly<{ options: readonly SelectOption[]; emptyLabel?: string }>;

/** `emptyLabel` adds a leading option with an empty value, for optional choices. */
export function SelectField<Values extends FieldValues>({ control, name, label, helperText, options, emptyLabel }: SelectFieldProps<Values>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField {...field} error={fieldState.invalid} fullWidth helperText={fieldState.error?.message ?? helperText} label={label} select slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
          {emptyLabel === undefined ? null : <MenuItem value="">{emptyLabel}</MenuItem>}
          {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      )}
    />
  );
}

/** A list of short strings (emails, domains, language codes) typed one at a time; Enter, comma or leaving the field adds one. */
export function TagsField<Values extends FieldValues>({ control, name, label, helperText, placeholder }: BaseProps<Values> & Readonly<{ placeholder?: string }>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          autoSelect
          freeSolo
          multiple
          onChange={(_event, next) => field.onChange(next.map((item) => item.trim()).filter(Boolean))}
          options={[]}
          renderInput={(params) => <TextField {...params} error={fieldState.invalid} helperText={fieldState.error?.message ?? helperText} label={label} onBlur={field.onBlur} placeholder={field.value.length === 0 ? placeholder : undefined} slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps?.inputLabel, shrink: true } }} />}
          renderValue={(values, getItemProps) => values.map((value, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            return <Chip key={key} label={value} size="small" {...itemProps} />;
          })}
          value={field.value}
        />
      )}
    />
  );
}

/** Several choices from a fixed list, shown as chips; an empty list means "no restriction". */
export function MultiSelectField<Values extends FieldValues>({ control, name, label, helperText, options }: BaseProps<Values> & Readonly<{ options: readonly SelectOption[] }>) {
  const labelOf = (value: string) => options.find((option) => option.value === value)?.label ?? value;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          error={fieldState.invalid}
          fullWidth
          helperText={fieldState.error?.message ?? helperText}
          label={label}
          select
          slotProps={{
            inputLabel: { shrink: true },
            select: { displayEmpty: true, multiple: true, renderValue: (selected) => (Array.isArray(selected) && selected.length > 0 ? <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>{selected.map((value: string) => <Chip key={value} label={labelOf(value)} size="small" />)}</Box> : <Box component="span" sx={{ color: "text.secondary" }}>Any</Box>) }
          }}
        >
          {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      )}
    />
  );
}

