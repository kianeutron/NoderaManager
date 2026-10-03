import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

/** A titled block inside a preview panel. */
export function PreviewSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Box component="section">
      <Typography color="text.secondary" component="h3" sx={{ mb: 1 }} variant="overline">{title}</Typography>
      {children}
    </Box>
  );
}

type Fact = Readonly<{ term: string; value: ReactNode }>;

/** Term and value pairs as a real description list, values right-aligned. */
export function FactList({ facts }: Readonly<{ facts: readonly Fact[] }>) {
  return (
    <Box component="dl" sx={{ columnGap: 2, display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", m: 0, rowGap: 1 }}>
      {facts.map(({ term, value }) => (
        <Box key={term} sx={{ display: "contents" }}>
          <Typography color="text.secondary" component="dt" variant="body2">{term}</Typography>
          <Typography component="dd" sx={{ m: 0, overflowWrap: "anywhere", textAlign: "right" }} variant="body2">{value}</Typography>
        </Box>
      ))}
    </Box>
  );
}
