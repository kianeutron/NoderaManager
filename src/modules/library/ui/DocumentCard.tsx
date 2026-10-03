import { Box, Card, CardActionArea, Typography } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import type { DocumentSummary } from "@/modules/library/domain/document.types";
import { DocumentCover } from "@/modules/library/ui/DocumentCover";
import { categoryMeta, formatBytes } from "@/modules/library/ui/document-presentation";

const CardRoot = styled(Card, { shouldForwardProp: (prop) => prop !== "selected" })<{ selected: boolean }>(({ theme, selected }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.72),
  backgroundImage: "none",
  border: `1px solid ${selected ? theme.palette.primary.main : alpha(theme.palette.primary.light, 0.16)}`,
  boxShadow: selected ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.28)}` : "none",
  height: "100%",
  transition: theme.transitions.create(["border-color", "box-shadow", "transform"], { duration: theme.transitions.duration.shorter }),
  "@media (hover: hover)": { "&:hover": { borderColor: alpha(theme.palette.primary.light, 0.5), transform: "translateY(-2px)" } },
  "@media (prefers-reduced-motion: reduce)": { transition: "none", "&:hover": { transform: "none" } }
}));

const twoLineClamp = { display: "-webkit-box", overflow: "hidden", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 } as const;

type DocumentCardProps = Readonly<{ document: DocumentSummary; selected: boolean; onSelect: (documentId: string) => void }>;

export function DocumentCard({ document, selected, onSelect }: DocumentCardProps) {
  const { file } = document;
  const subtitle = [categoryMeta[document.category].label, file ? formatBytes(file.sizeBytes) : null].filter(Boolean).join(" · ");

  return (
    <CardRoot selected={selected} variant="outlined">
      <CardActionArea aria-current={selected ? "true" : undefined} onClick={() => onSelect(document.id)} sx={{ alignItems: "stretch", display: "flex", flexDirection: "column", height: "100%", justifyContent: "flex-start", p: 1.25 }}>
        <DocumentCover category={document.category} mimeType={file?.mimeType ?? null} />
        <Box sx={{ pt: 1.25, px: 0.25 }}>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.3, overflowWrap: "anywhere", ...twoLineClamp }} variant="body2">{document.title}</Typography>
          <Typography color="text.secondary" noWrap sx={{ display: "block", mt: 0.25 }} variant="caption">{subtitle}</Typography>
        </Box>
      </CardActionArea>
    </CardRoot>
  );
}
