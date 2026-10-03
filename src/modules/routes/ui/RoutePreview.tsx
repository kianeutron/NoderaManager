import AddRounded from "@mui/icons-material/AddRounded";
import ArchiveRounded from "@mui/icons-material/ArchiveRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import HubRounded from "@mui/icons-material/HubRounded";
import UnarchiveRounded from "@mui/icons-material/UnarchiveRounded";
import { Box, Button, Chip, IconButton, Stack, Typography } from "@mui/material";
import type { RouteModuleOverview, RouteOverview, RouteStats } from "@/modules/routes/domain/route.types";
import { ArchivedNotice } from "@/shared/ui/ArchivedNotice";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { FactList, PreviewSection } from "@/shared/ui/PreviewSection";

const statsLine = ({ prospects, openProspects, won, messages, replies }: RouteStats) => `${prospects} prospects (${openProspects} open, ${won} won) · ${messages} sent · ${replies} replies`;

type RoutePreviewProps = Readonly<{
  route: RouteOverview;
  onAddModule: () => void;
  onEditModule: (routeModule: RouteModuleOverview) => void;
  onToggleModuleArchived: (routeModule: RouteModuleOverview) => void;
}>;

export function RoutePreview({ route, onAddModule, onEditModule, onToggleModuleArchived }: RoutePreviewProps) {
  const isArchived = route.archivedAt !== null;
  const facts = [
    { term: "Order", value: route.sortOrder },
    { term: "Prospects", value: `${route.stats.prospects} (${route.stats.openProspects} open)` },
    { term: "Won", value: route.stats.won },
    { term: "Messages sent", value: route.stats.messages },
    { term: "Replies", value: route.stats.replies }
  ];

  return (
    <Stack sx={{ gap: 3 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
        <EntityAvatar icon={<HubRounded />} name={route.name} size={56} />
        <Typography component="h2" sx={{ overflowWrap: "anywhere" }} variant="h6">{route.name}</Typography>
      </Stack>

      {route.archivedAt ? <ArchivedNotice archivedAt={route.archivedAt} /> : null}
      {route.description ? <Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} variant="body2">{route.description}</Typography> : null}

      <PreviewSection title="Results so far"><FactList facts={facts} /></PreviewSection>

      <PreviewSection title="Modules">
        <Stack sx={{ gap: 1.5 }}>
          {route.modules.length === 0 ? <Typography color="text.secondary" variant="body2">No modules yet. Add one for each narrower tactic.</Typography> : null}
          {route.modules.map((routeModule) => (
            <Stack direction="row" key={routeModule.id} sx={{ alignItems: "flex-start", gap: 0.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }} variant="body2">{routeModule.name}</Typography>
                  {routeModule.archivedAt ? <Chip label="Archived" size="small" variant="outlined" /> : null}
                </Stack>
                {routeModule.description ? <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }} variant="body2">{routeModule.description}</Typography> : null}
                <Typography color="text.secondary" variant="caption">{statsLine(routeModule.stats)}</Typography>
              </Box>
              {isArchived ? null : (
                <>
                  <IconButton aria-label={`Edit ${routeModule.name}`} disabled={routeModule.archivedAt !== null} onClick={() => onEditModule(routeModule)} size="small"><EditRounded fontSize="small" /></IconButton>
                  <IconButton aria-label={`${routeModule.archivedAt ? "Restore" : "Archive"} ${routeModule.name}`} onClick={() => onToggleModuleArchived(routeModule)} size="small">{routeModule.archivedAt ? <UnarchiveRounded fontSize="small" /> : <ArchiveRounded fontSize="small" />}</IconButton>
                </>
              )}
            </Stack>
          ))}
          {isArchived ? null : <Button onClick={onAddModule} startIcon={<AddRounded />} sx={{ alignSelf: "flex-start" }}>Add module</Button>}
        </Stack>
      </PreviewSection>
    </Stack>
  );
}
