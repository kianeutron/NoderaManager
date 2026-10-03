import HubRounded from "@mui/icons-material/HubRounded";
import { Chip } from "@mui/material";
import type { RouteOverview } from "@/modules/routes/domain/route.types";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { EntityRow } from "@/shared/ui/EntityRow";

type RouteRowProps = Readonly<{ route: RouteOverview; selected: boolean; onSelect: () => void }>;

const counted = (value: number, singular: string, plural = `${singular}s`) => `${value} ${value === 1 ? singular : plural}`;

/** A route and, at a glance, what it has produced. */
export function RouteRow({ route, selected, onSelect }: RouteRowProps) {
  const liveModules = route.modules.filter((routeModule) => routeModule.archivedAt === null).length;

  return (
    <EntityRow
      avatar={<EntityAvatar icon={<HubRounded fontSize="small" />} name={route.name} />}
      meta={(
        <>
          <Chip label={counted(liveModules, "module")} size="small" variant="outlined" />
          <Chip label={counted(route.stats.prospects, "prospect")} size="small" variant="outlined" />
          <Chip label={`${route.stats.messages} sent`} size="small" variant="outlined" />
          {route.stats.replies > 0 ? <Chip color="success" label={counted(route.stats.replies, "reply", "replies")} size="small" variant="outlined" /> : null}
        </>
      )}
      onSelect={onSelect}
      selected={selected}
      subtitle={route.description}
      title={route.name}
    />
  );
}
