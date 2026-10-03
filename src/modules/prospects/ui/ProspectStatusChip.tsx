import { Chip } from "@mui/material";
import type { ProspectStatus } from "@/modules/prospects/domain/prospect.types";
import { prospectStatusMeta } from "@/modules/prospects/ui/prospect-presentation";

/** The status is always spelled out, never conveyed by color alone. */
export function ProspectStatusChip({ status }: Readonly<{ status: ProspectStatus }>) {
  const { label, color } = prospectStatusMeta[status];

  return <Chip color={color} label={label} size="small" sx={{ fontWeight: 700 }} variant="outlined" />;
}
