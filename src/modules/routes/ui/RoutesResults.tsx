"use client";

import { Button } from "@mui/material";
import { RouteRow } from "@/modules/routes/ui/RouteRow";
import { useRouteOverview } from "@/modules/routes/ui/use-route-queries";
import type { RecordScope } from "@/shared/api/field-schemas";
import { describeError } from "@/shared/api/error-copy";
import { EmptyState } from "@/shared/ui/EmptyState";
import { EntityList, EntityListSkeleton } from "@/shared/ui/EntityList";
import { ErrorState } from "@/shared/ui/ErrorState";

type RoutesResultsProps = Readonly<{ scope: RecordScope; selectedId: string | null; onSelect: (routeId: string) => void; onShowActive: () => void }>;

/** Every route in one list: there are only ever a handful, so no paging. */
export function RoutesResults({ scope, selectedId, onSelect, onShowActive }: RoutesResultsProps) {
  const query = useRouteOverview(scope);

  if (query.isPending) return <EntityListSkeleton count={4} />;
  if (query.isError) return <ErrorState description={describeError(query.error, "route")} onRetry={() => void query.refetch()} title="Routes could not be loaded" />;
  if (query.data.length === 0) {
    return scope === "archived"
      ? <EmptyState action={<Button onClick={onShowActive} variant="outlined">Show active routes</Button>} description="Routes you archive are kept here, and can be restored." title="No archived routes" />
      : <EmptyState description="Add a route for each way you look for clients, such as Agency Overflow or Recruiters." title="No routes yet" />;
  }

  return <EntityList items={query.data} label="Routes" renderRow={(route) => <RouteRow onSelect={() => onSelect(route.id)} route={route} selected={selectedId === route.id} />} />;
}
