"use client";

import EditRounded from "@mui/icons-material/EditRounded";
import { Button, Skeleton, Stack } from "@mui/material";
import { useState } from "react";
import type { RouteModuleOverview } from "@/modules/routes/domain/route.types";
import { ModuleForm } from "@/modules/routes/ui/ModuleForm";
import { RouteForm } from "@/modules/routes/ui/RouteForm";
import { RoutePreview } from "@/modules/routes/ui/RoutePreview";
import { useSetRouteArchived, useSetRouteModuleArchived } from "@/modules/routes/ui/use-route-mutations";
import { useRouteOverview } from "@/modules/routes/ui/use-route-queries";
import type { RecordScope } from "@/shared/api/field-schemas";
import { describeError } from "@/shared/api/error-copy";
import { ArchiveAction } from "@/shared/ui/ArchiveAction";
import { ErrorState } from "@/shared/ui/ErrorState";
import { PreviewFrame } from "@/shared/ui/PreviewFrame";

type RoutePreviewPanelProps = Readonly<{
  routeId: string;
  /** The list the route was picked from. The panel reads its route out of that list, so it always agrees with it. */
  scope: RecordScope;
  onClose: () => void;
  /** After archiving or restoring, the route moves to the other list: follow it, so the panel does not go blank. */
  onScopeChange: (scope: RecordScope) => void;
}>;

type Dialog = { kind: "edit" } | { kind: "add-module" } | { kind: "edit-module"; module: RouteModuleOverview };

export function RoutePreviewPanel({ routeId, scope, onClose, onScopeChange }: RoutePreviewPanelProps) {
  const query = useRouteOverview(scope);
  const routeArchiver = useSetRouteArchived();
  const moduleArchiver = useSetRouteModuleArchived();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const closeDialog = () => setDialog(null);
  const route = query.data?.find((candidate) => candidate.id === routeId);

  if (query.isPending) return <PreviewFrame onClose={onClose}><Stack aria-busy aria-label="Loading route" sx={{ gap: 2 }}><Skeleton height={56} variant="rounded" /><Skeleton height={120} variant="rounded" /></Stack></PreviewFrame>;
  if (query.isError) return <PreviewFrame onClose={onClose}><ErrorState description={describeError(query.error, "route")} onRetry={() => void query.refetch()} title="Something went wrong" /></PreviewFrame>;
  if (!route) return <PreviewFrame onClose={onClose}><ErrorState description="This route is no longer in this list." title="Not found" /></PreviewFrame>;

  return (
    <>
      <PreviewFrame
        footer={(
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
            {route.archivedAt ? null : <Button onClick={() => setDialog({ kind: "edit" })} startIcon={<EditRounded />} variant="outlined">Edit</Button>}
            <ArchiveAction archived={route.archivedAt !== null} error={routeArchiver.error} name={route.name} noun="route" onChange={async (archive) => { await routeArchiver.mutateAsync({ routeId: route.id, archive }); onScopeChange(archive ? "archived" : "active"); }} pending={routeArchiver.isPending} />
          </Stack>
        )}
        onClose={onClose}
      >
        <RoutePreview onAddModule={() => setDialog({ kind: "add-module" })} onEditModule={(routeModule) => setDialog({ kind: "edit-module", module: routeModule })} onToggleModuleArchived={(routeModule) => void moduleArchiver.mutateAsync({ routeModuleId: routeModule.id, archive: routeModule.archivedAt === null }).catch(() => undefined)} route={route} />
      </PreviewFrame>
      {dialog?.kind === "edit" ? <RouteForm onClose={closeDialog} onSaved={closeDialog} route={route} /> : null}
      {dialog?.kind === "add-module" ? <ModuleForm onClose={closeDialog} onSaved={closeDialog} routeId={route.id} /> : null}
      {dialog?.kind === "edit-module" ? <ModuleForm module={dialog.module} onClose={closeDialog} onSaved={closeDialog} routeId={route.id} /> : null}
    </>
  );
}
