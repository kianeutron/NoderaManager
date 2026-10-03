import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { DocumentCategory } from "@/modules/library/domain/document.schema";
import { categoryMeta, fileKindMeta, getFileKind } from "@/modules/library/ui/document-presentation";

type DocumentCoverProps = Readonly<{ category: DocumentCategory; mimeType: string | null; iconSize?: number }>;

/** Stands in for a thumbnail: category sets the color, the file type sets the glyph. Decorative, so hidden from assistive tech. */
export function DocumentCover({ category, mimeType, iconSize = 52 }: DocumentCoverProps) {
  const { Icon, label } = fileKindMeta[getFileKind(mimeType)];
  const { tone } = categoryMeta[category];

  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        alignItems: "center",
        aspectRatio: "3 / 4",
        background: `linear-gradient(155deg, ${alpha(theme.palette[tone].main, 0.5)}, ${alpha(theme.palette[tone].dark, 0.16)} 72%), ${theme.palette.background.paper}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.common.white, 0.08)}`,
        color: theme.palette[tone].light,
        display: "flex",
        justifyContent: "center",
        position: "relative"
      })}
    >
      <Icon sx={{ fontSize: iconSize }} />
      <Box component="span" sx={(theme) => ({ backgroundColor: alpha(theme.palette.common.black, 0.4), borderRadius: 1, bottom: 10, color: "common.white", fontSize: 11, fontWeight: 800, left: 10, letterSpacing: 0.4, position: "absolute", px: 1, py: 0.25 })}>
        {label.toUpperCase()}
      </Box>
    </Box>
  );
}
