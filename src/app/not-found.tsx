import Link from "next/link";
import { Button, Stack, Typography } from "@mui/material";
import { GlassPanel } from "@/shared/ui/GlassPanel";

export default function NotFound() {
  return <Stack sx={{ alignItems: "center", justifyContent: "center", minHeight: "100vh", p: 3 }}><GlassPanel sx={{ maxWidth: 520, p: 4, textAlign: "center" }}><Typography variant="h5">That workspace view is not here</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Return to your outreach overview to continue.</Typography><Link href="/"><Button sx={{ mt: 2 }} variant="contained">Return to overview</Button></Link></GlassPanel></Stack>;
}
