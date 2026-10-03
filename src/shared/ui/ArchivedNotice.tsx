import { Alert } from "@mui/material";
import { formatDate } from "@/shared/lib/format-date";

/** Shown at the top of an archived record's preview. */
export function ArchivedNotice({ archivedAt }: Readonly<{ archivedAt: string }>) {
  return <Alert severity="info">Archived on {formatDate(archivedAt)}. It is hidden from lists and searches until restored.</Alert>;
}
