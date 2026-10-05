import { Box, Skeleton } from "@mui/material";

/** The shape of a dashboard page's content (a row of figures and two panels) while it loads, so nothing jumps when it arrives. */
export function ContentSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <Box aria-busy="true" aria-label={label} role="status" sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" } }}>
        {[0, 1, 2, 3].map((tile) => <Skeleton height={128} key={tile} sx={{ borderRadius: 3 }} variant="rounded" />)}
      </Box>
      <Skeleton height={320} sx={{ borderRadius: 3 }} variant="rounded" />
      <Skeleton height={240} sx={{ borderRadius: 3 }} variant="rounded" />
    </Box>
  );
}
