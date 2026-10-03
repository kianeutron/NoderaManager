import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import type { DocumentDetail } from "@/modules/library/domain/document.types";
import { DocumentCover } from "@/modules/library/ui/DocumentCover";
import { DetailsSection, LinksSection, VersionsSection } from "@/modules/library/ui/DocumentPreviewSections";
import { categoryMeta, fileKindMeta, formatBytes, getFileKind } from "@/modules/library/ui/document-presentation";

function DocumentStats({ file }: Readonly<{ file: NonNullable<DocumentDetail["file"]> }>) {
  const stats = [
    { label: "Version", value: `v${file.versionNumber}` },
    { label: "Size", value: formatBytes(file.sizeBytes) },
    { label: "Type", value: fileKindMeta[getFileKind(file.mimeType)].label }
  ];

  return (
    <Stack divider={<Divider flexItem orientation="vertical" />} direction="row" sx={{ justifyContent: "space-around" }}>
      {stats.map(({ label, value }) => (
        <Box key={label} sx={{ px: 1, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700 }} variant="body1">{value}</Typography>
          <Typography color="text.secondary" variant="caption">{label}</Typography>
        </Box>
      ))}
    </Stack>
  );
}

/** Pure presentation of one document; data loading and actions live in the panel around it. */
export function DocumentPreview({ document }: Readonly<{ document: DocumentDetail }>) {
  const { label, tone } = categoryMeta[document.category];

  return (
    <Stack sx={{ gap: 2.5 }}>
      <Box sx={{ alignSelf: "center", width: 168 }}>
        <DocumentCover category={document.category} iconSize={64} mimeType={document.file?.mimeType ?? null} />
      </Box>
      <Stack sx={{ alignItems: "center", gap: 0.75 }}>
        <Typography component="h2" sx={{ overflowWrap: "anywhere", textAlign: "center" }} variant="h6">{document.title}</Typography>
        <Chip color={tone} label={label} size="small" variant="outlined" />
      </Stack>
      {document.file ? <DocumentStats file={document.file} /> : null}
      {document.tags.length > 0 ? (
        <Stack aria-label="Tags" component="ul" direction="row" sx={{ flexWrap: "wrap", gap: 0.75, justifyContent: "center", listStyle: "none", m: 0, p: 0 }}>
          {document.tags.map((tag) => <li key={tag}><Chip label={tag} size="small" /></li>)}
        </Stack>
      ) : null}
      <Typography color="text.secondary" sx={{ overflowWrap: "anywhere", whiteSpace: "pre-line" }} variant="body2">{document.description ?? "No description added yet."}</Typography>
      <DetailsSection document={document} />
      {document.links.length > 0 ? <LinksSection links={document.links} /> : null}
      {document.versions.length > 0 ? <VersionsSection versions={document.versions} /> : null}
    </Stack>
  );
}
