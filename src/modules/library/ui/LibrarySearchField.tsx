"use client";

import CloseRounded from "@mui/icons-material/CloseRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useDebouncedInput } from "@/shared/lib/use-debounced-input";

type LibrarySearchFieldProps = Readonly<{ value: string; onCommit: (value: string) => void }>;

export function LibrarySearchField({ value, onCommit }: LibrarySearchFieldProps) {
  const [draft, setDraft] = useDebouncedInput(value, onCommit);

  return (
    <TextField
      fullWidth
      onChange={(event) => setDraft(event.target.value)}
      placeholder="Search titles, tags and document text"
      slotProps={{
        htmlInput: { "aria-label": "Search documents" },
        input: {
          startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment>,
          endAdornment: draft ? <InputAdornment position="end"><IconButton aria-label="Clear search" edge="end" onClick={() => setDraft("")} size="small"><CloseRounded fontSize="small" /></IconButton></InputAdornment> : null
        }
      }}
      value={draft}
    />
  );
}
