"use client";

import CloseRounded from "@mui/icons-material/CloseRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useDebouncedInput } from "@/shared/lib/use-debounced-input";

type SearchFieldProps = Readonly<{
  /** The committed value, normally from the URL. Typing is debounced before `onCommit` reports it. */
  value: string;
  onCommit: (value: string) => void;
  label: string;
  placeholder: string;
}>;

export function SearchField({ value, onCommit, label, placeholder }: SearchFieldProps) {
  const [draft, setDraft] = useDebouncedInput(value, onCommit);

  return (
    <TextField
      fullWidth
      onChange={(event) => setDraft(event.target.value)}
      placeholder={placeholder}
      slotProps={{
        htmlInput: { "aria-label": label },
        input: {
          startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment>,
          endAdornment: draft ? <InputAdornment position="end"><IconButton aria-label={`Clear ${label.toLowerCase()}`} edge="end" onClick={() => setDraft("")} size="small"><CloseRounded fontSize="small" /></IconButton></InputAdornment> : null
        }
      }}
      value={draft}
    />
  );
}
