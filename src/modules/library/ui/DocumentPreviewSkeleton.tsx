import { Skeleton, Stack } from "@mui/material";

export function DocumentPreviewSkeleton() {
  return (
    <Stack aria-busy aria-label="Loading document" sx={{ alignItems: "center", gap: 2 }}>
      <Skeleton sx={{ aspectRatio: "3 / 4", height: "auto", transform: "none" }} variant="rounded" width={168} />
      <Skeleton variant="text" width="70%" />
      <Skeleton height={44} variant="rounded" width="100%" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
    </Stack>
  );
}
