"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import { Box, Button, Stack, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { OrganizationFormDialog } from "@/modules/organizations/ui/OrganizationFormDialog";
import { OrganizationFilterBar } from "@/modules/organizations/ui/OrganizationFilterBar";
import { OrganizationPreviewPanel } from "@/modules/organizations/ui/OrganizationPreviewPanel";
import { OrganizationResults } from "@/modules/organizations/ui/OrganizationResults";
import { PeopleFilterBar } from "@/modules/people/ui/PeopleFilterBar";
import { PeopleResults } from "@/modules/people/ui/PeopleResults";
import { PersonFormDialog } from "@/modules/people/ui/PersonFormDialog";
import { PersonPreviewPanel } from "@/modules/people/ui/PersonPreviewPanel";
import { workspaceViews, type WorkspaceView } from "@/modules/people/ui/people-workspace-url-state";
import { usePeopleWorkspace } from "@/modules/people/ui/use-people-workspace";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PreviewDock } from "@/shared/ui/PreviewDock";
import { PreviewLayout } from "@/shared/ui/PreviewLayout";
import { SearchField } from "@/shared/ui/SearchField";
import { SectionPanel } from "@/shared/ui/SectionPanel";

const viewLabel = { people: "People", companies: "Companies" } as const satisfies Record<WorkspaceView, string>;

export function PeopleAndCompaniesPage() {
  const workspace = usePeopleWorkspace();
  const { state, setFilters, select, switchView, openPerson, openOrganization, showPeopleOf } = workspace;
  const isPeople = state.view === "people";
  const [adding, setAdding] = useState(false);
  const closeAdding = () => setAdding(false);

  return (
    <>
      <PreviewLayout
        hasPreview={state.selectedId !== null}
        preview={(
          <PreviewDock label={isPeople ? "Person preview" : "Company preview"} onClose={() => select(null)} selectedId={state.selectedId}>
            {(id) => isPeople
              ? <PersonPreviewPanel onClose={() => select(null)} onOpenOrganization={openOrganization} personId={id} />
              : <OrganizationPreviewPanel onClose={() => select(null)} onOpenPerson={openPerson} onShowPeople={showPeopleOf} organizationId={id} />}
          </PreviewDock>
        )}
      >
        <Stack sx={{ gap: 2.5 }}>
          <PageHeader
            actions={<Button onClick={() => setAdding(true)} startIcon={<AddRounded />} variant="contained">{isPeople ? "Add person" : "Add company"}</Button>}
            description="Everyone you might reach and the companies they work for."
            eyebrow="Network"
            title="People & companies"
            toolbar={(
              <Stack direction={{ xs: "column", md: "row" }} sx={{ alignItems: { md: "center" }, gap: 2 }}>
                <Tabs aria-label="Network view" onChange={(_event, view: WorkspaceView) => switchView(view)} sx={{ flexShrink: 0 }} value={state.view}>
                  {workspaceViews.map((view) => <Tab id={`view-${view}`} key={view} label={viewLabel[view]} value={view} />)}
                </Tabs>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <SearchField label={isPeople ? "Search people" : "Search companies"} onCommit={(value) => setFilters({ q: value.trim() || undefined }, "replace")} placeholder={isPeople ? "Name, role, email or LinkedIn" : "Company name or domain"} value={state.q ?? ""} />
                </Box>
              </Stack>
            )}
          />
          <Stack sx={{ gap: 2.5 }}>
            <SectionPanel title={viewLabel[state.view]}>
              <Stack sx={{ gap: 2 }}>
                {isPeople ? <PeopleFilterBar workspace={workspace} /> : <OrganizationFilterBar workspace={workspace} />}
                {isPeople ? <PeopleResults workspace={workspace} /> : <OrganizationResults workspace={workspace} />}
              </Stack>
            </SectionPanel>
          </Stack>
        </Stack>
      </PreviewLayout>
      {adding && isPeople ? <PersonFormDialog onClose={closeAdding} onOpenPerson={(id) => { closeAdding(); openPerson(id); }} onSaved={(id) => { closeAdding(); select(id); }} /> : null}
      {adding && !isPeople ? <OrganizationFormDialog onClose={closeAdding} onOpenOrganization={(id) => { closeAdding(); openOrganization(id); }} onSaved={(id) => { closeAdding(); select(id); }} /> : null}
    </>
  );
}
