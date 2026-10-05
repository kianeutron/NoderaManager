import { Box, Skeleton, Stack } from "@mui/material";
import { ContentSkeleton } from "@/shared/ui/ContentSkeleton";

/** A whole dashboard page while the server prepares it: a heading, then the content shape. */
export function PageLoading() {
  return (
    <Stack sx={{ gap: 3 }}>
      <Box aria-hidden>
        <Skeleton height={16} sx={{ mb: 1 }} variant="rounded" width={96} />
        <Skeleton height={38} variant="rounded" width="min(360px, 70%)" />
        <Skeleton height={18} sx={{ mt: 1 }} variant="rounded" width="min(520px, 90%)" />
      </Box>
      <ContentSkeleton label="Loading page" />
    </Stack>
  );
}
