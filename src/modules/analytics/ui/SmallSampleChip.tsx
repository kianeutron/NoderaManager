import { Chip } from "@mui/material";

/** Beside a rate built from too few messages or prospects to rank on (docs/11-operations/02-analytics-definitions.md). */
export function SmallSampleChip() {
  return <Chip color="warning" label="Small sample" size="small" variant="outlined" />;
}
