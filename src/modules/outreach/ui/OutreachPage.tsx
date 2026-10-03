"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import { Button, Stack, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { FollowUpForm } from "@/modules/followups/ui/FollowUpForm";
import { FollowUpPreviewPanel } from "@/modules/followups/ui/FollowUpPreviewPanel";
import { LogOutreachDialog } from "@/modules/outreach/ui/LogOutreachDialog";
import { OutreachFollowUpsView } from "@/modules/outreach/ui/OutreachFollowUpsView";
import { OutreachMessagesView } from "@/modules/outreach/ui/OutreachMessagesView";
import { OutreachPreviewPanel } from "@/modules/outreach/ui/OutreachPreviewPanel";
import { outreachViews, type OutreachView } from "@/modules/outreach/ui/outreach-url-state";
import { useOutreachWorkspace } from "@/modules/outreach/ui/use-outreach-workspace";
import { AppShell } from "@/shared/ui/AppShell";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PreviewDock } from "@/shared/ui/PreviewDock";
import { PreviewLayout } from "@/shared/ui/PreviewLayout";

const viewLabel = { messages: "Messages", followups: "Follow-ups" } as const satisfies Record<OutreachView, string>;

export function OutreachPage() {
  const workspace = useOutreachWorkspace();
  const { state, select, switchView } = workspace;
  const isMessages = state.view === "messages";
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const closePreview = () => select(null);

  return (
    <AppShell>
      <PreviewLayout
        hasPreview={state.selectedId !== null}
        preview={(
          <PreviewDock label={isMessages ? "Message preview" : "Follow-up preview"} onClose={closePreview} selectedId={state.selectedId}>
            {(id) => isMessages ? <OutreachPreviewPanel messageId={id} onClose={closePreview} /> : <FollowUpPreviewPanel followUpId={id} onClose={closePreview} />}
          </PreviewDock>
        )}
      >
        <Stack sx={{ gap: 3.25 }}>
          <PageHeader
            actions={isMessages ? <LogOutreachDialog onSaved={select} /> : <Button onClick={() => setAddingFollowUp(true)} startIcon={<AddRounded />} variant="contained">Add follow-up</Button>}
            description="Messages you have sent, how they landed, and who to get back to."
            eyebrow="Execution"
            title="Outreach"
          />
          <Tabs aria-label="Outreach view" onChange={(_event, view: OutreachView) => switchView(view)} value={state.view}>
            {outreachViews.map((view) => <Tab id={`view-${view}`} key={view} label={viewLabel[view]} value={view} />)}
          </Tabs>
          {isMessages ? <OutreachMessagesView workspace={workspace} /> : <OutreachFollowUpsView workspace={workspace} />}
        </Stack>
      </PreviewLayout>
      {addingFollowUp ? <FollowUpForm onClose={() => setAddingFollowUp(false)} onSaved={(id) => { setAddingFollowUp(false); select(id); }} /> : null}
    </AppShell>
  );
}
