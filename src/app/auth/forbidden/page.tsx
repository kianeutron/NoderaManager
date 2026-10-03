import { Box, Stack, Typography } from "@mui/material";
import { GlassPanel } from "@/shared/ui/GlassPanel";

export default function ForbiddenPage() {
  return (
    <Box sx={{ alignItems: "center", display: "flex", justifyContent: "center", minHeight: "100vh", p: 2 }}>
      <GlassPanel sx={{ maxWidth: 460, p: { xs: 3, sm: 4 }, width: "100%" }}>
        <Stack spacing={1}><Typography color="error.main" variant="overline">Access denied</Typography><Typography variant="h4">This workspace is private.</Typography><Typography color="text.secondary" variant="body2">The authenticated account is not allowed to access this dashboard.</Typography></Stack>
      </GlassPanel>
    </Box>
  );
}
