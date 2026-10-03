import { Box, Chip, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { DocumentDetail } from "@/modules/library/domain/document.types";
import { extractionLabel, formatBytes, formatDate, linkRelationLabel, linkTargetMeta } from "@/modules/library/ui/document-presentation";

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Box component="section">
      <Typography color="text.secondary" component="h3" sx={{ mb: 1 }} variant="overline">{title}</Typography>
      {children}
    </Box>
  );
}

export function DetailsSection({ document }: Readonly<{ document: DocumentDetail }>) {
  const details = [
    { term: "File name", value: document.file?.originalFilename ?? "—" },
    { term: "Folder", value: document.folderPath.length > 0 ? document.folderPath.map((folder) => folder.name).join(" / ") : "Unfiled" },
    { term: "Updated", value: formatDate(document.updatedAt) },
    { term: "Search", value: document.file ? extractionLabel[document.file.extractionStatus] : "—" }
  ];

  return (
    <Section title="Details">
      <Box component="dl" sx={{ columnGap: 2, display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", m: 0, rowGap: 1 }}>
        {details.map(({ term, value }) => (
          <Box key={term} sx={{ display: "contents" }}>
            <Typography color="text.secondary" component="dt" variant="body2">{term}</Typography>
            <Typography component="dd" sx={{ m: 0, overflowWrap: "anywhere", textAlign: "right" }} variant="body2">{value}</Typography>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

export function LinksSection({ links }: Readonly<{ links: DocumentDetail["links"] }>) {
  return (
    <Section title="Linked to">
      <Stack component="ul" sx={{ gap: 1, listStyle: "none", m: 0, p: 0 }}>
        {links.map((link) => {
          const { Icon, label } = linkTargetMeta[link.targetType];
          return (
            <Stack component="li" direction="row" key={link.id} sx={{ alignItems: "center", gap: 1.25 }}>
              <Icon aria-label={label} color="primary" fontSize="small" role="img" />
              <Typography sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }} variant="body2">{link.label}</Typography>
              <Chip label={linkRelationLabel[link.relation]} size="small" variant="outlined" />
            </Stack>
          );
        })}
      </Stack>
    </Section>
  );
}

export function VersionsSection({ versions }: Readonly<{ versions: DocumentDetail["versions"] }>) {
  return (
    <Section title="Version history">
      <Stack component="ul" sx={{ gap: 1.25, listStyle: "none", m: 0, p: 0 }}>
        {versions.map((version) => (
          <Box component="li" key={version.id}>
            <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 700 }} variant="body2">v{version.versionNumber}{version.isCurrent ? " · Current" : ""}</Typography>
              <Typography color="text.secondary" variant="caption">{formatDate(version.createdAt)} · {formatBytes(version.sizeBytes)}</Typography>
            </Stack>
            {version.changeNote ? <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }} variant="caption">{version.changeNote}</Typography> : null}
          </Box>
        ))}
      </Stack>
    </Section>
  );
}
