import DownloadRounded from "@mui/icons-material/DownloadRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { Button, IconButton, Stack, Tooltip } from "@mui/material";
import type { DocumentDetail } from "@/modules/library/domain/document.types";
import { isInlineViewable } from "@/modules/library/domain/file-delivery";
import { documentFilePath } from "@/modules/library/ui/library-api";

/** Browsers can display some types (PDF, images, text); everything else is offered as a download only. */
export function DocumentActions({ document }: Readonly<{ document: DocumentDetail }>) {
  if (!document.file) return <Button disabled fullWidth variant="contained">No file uploaded yet</Button>;

  if (!isInlineViewable(document.file.mimeType)) {
    return <Button component="a" fullWidth href={documentFilePath(document.id, "attachment")} startIcon={<DownloadRounded />} variant="contained">Download</Button>;
  }

  return (
    <Stack direction="row" sx={{ gap: 1 }}>
      <Button component="a" fullWidth href={documentFilePath(document.id, "inline")} rel="noopener noreferrer" startIcon={<OpenInNewRounded />} target="_blank" variant="contained">Open document</Button>
      <Tooltip title="Download">
        <IconButton aria-label="Download" component="a" href={documentFilePath(document.id, "attachment")} sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}><DownloadRounded /></IconButton>
      </Tooltip>
    </Stack>
  );
}
