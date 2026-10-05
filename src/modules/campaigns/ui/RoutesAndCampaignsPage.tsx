"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import { Button, Stack, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { CampaignForm } from "@/modules/campaigns/ui/CampaignForm";
import { CampaignPreviewPanel } from "@/modules/campaigns/ui/CampaignPreviewPanel";
import { CampaignsView } from "@/modules/campaigns/ui/CampaignsView";
import { strategyViews, type StrategyView } from "@/modules/campaigns/ui/strategy-url-state";
import { useStrategyWorkspace } from "@/modules/campaigns/ui/use-strategy-workspace";
import { RouteForm } from "@/modules/routes/ui/RouteForm";
import { RoutePreviewPanel } from "@/modules/routes/ui/RoutePreviewPanel";
import { RoutesView } from "@/modules/routes/ui/RoutesView";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PreviewDock } from "@/shared/ui/PreviewDock";
import { PreviewLayout } from "@/shared/ui/PreviewLayout";

const viewLabel = { routes: "Routes", campaigns: "Campaigns" } as const satisfies Record<StrategyView, string>;

export function RoutesAndCampaignsPage() {
  const workspace = useStrategyWorkspace();
  const { state, setFilters, select, switchView } = workspace;
  const isRoutes = state.view === "routes";
  const [adding, setAdding] = useState(false);
  const closePreview = () => select(null);
  const closeAdding = () => setAdding(false);

  return (
    <>
      <PreviewLayout
        hasPreview={state.selectedId !== null}
        preview={(
          <PreviewDock label={isRoutes ? "Route preview" : "Campaign preview"} onClose={closePreview} selectedId={state.selectedId}>
            {(id) => isRoutes
              ? <RoutePreviewPanel onClose={closePreview} onScopeChange={(scope) => setFilters({ scope })} routeId={id} scope={state.scope} />
              : <CampaignPreviewPanel campaignId={id} onClose={closePreview} />}
          </PreviewDock>
        )}
      >
        <Stack sx={{ gap: 3.25 }}>
          <PageHeader
            actions={<Button onClick={() => setAdding(true)} startIcon={<AddRounded />} variant="contained">{isRoutes ? "Add route" : "Add campaign"}</Button>}
            description="The ways you look for clients, and the campaigns that work them."
            eyebrow="Strategy"
            title="Routes & campaigns"
          />
          <Tabs aria-label="Strategy view" onChange={(_event, view: StrategyView) => switchView(view)} value={state.view}>
            {strategyViews.map((view) => <Tab id={`view-${view}`} key={view} label={viewLabel[view]} value={view} />)}
          </Tabs>
          {isRoutes ? <RoutesView onScopeChange={(scope) => setFilters({ scope })} onSelect={select} scope={state.scope} selectedId={state.selectedId} /> : <CampaignsView workspace={workspace} />}
        </Stack>
      </PreviewLayout>
      {adding && isRoutes ? <RouteForm onClose={closeAdding} onSaved={(id) => { closeAdding(); select(id); }} /> : null}
      {adding && !isRoutes ? <CampaignForm onClose={closeAdding} onSaved={(id) => { closeAdding(); select(id); }} /> : null}
    </>
  );
}
