"use client";

import { Alert, Button, Stack } from "@mui/material";
import { useState } from "react";
import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";
import { campaignNextSteps } from "@/modules/campaigns/ui/campaign-presentation";
import { useSetCampaignStatus } from "@/modules/campaigns/ui/use-campaign-mutations";
import { describeError } from "@/shared/api/error-copy";
import { ConfirmDialog } from "@/shared/ui/form/ConfirmDialog";

type CampaignStatusActionsProps = Readonly<{ campaignId: string; status: CampaignStatus }>;

/** The moves the lifecycle allows from here: Start, Pause, Resume, Complete. Completing is final, so it asks first. */
export function CampaignStatusActions({ campaignId, status }: CampaignStatusActionsProps) {
  const mutation = useSetCampaignStatus();
  const [confirming, setConfirming] = useState<CampaignStatus | null>(null);
  const steps = campaignNextSteps[status];
  if (steps.length === 0) return null;

  const change = (to: CampaignStatus) => mutation.mutateAsync({ campaignId, status: to }).then(() => setConfirming(null), () => undefined);

  return (
    <Stack sx={{ gap: 1 }}>
      {mutation.error && confirming === null ? <Alert severity="error">{describeError(mutation.error, "campaign")}</Alert> : null}
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {steps.map((step) => (
          <Button color={step.confirm ? "inherit" : "primary"} disabled={mutation.isPending} key={step.to} onClick={() => (step.confirm ? setConfirming(step.to) : void change(step.to))} variant={step.confirm ? "text" : "contained"}>{step.label}</Button>
        ))}
      </Stack>
      {confirming ? (
        <ConfirmDialog
          confirmLabel="Complete"
          description="A completed campaign is fixed: its members, routes and dates can no longer change. You can still read it and archive it."
          error={mutation.error ? describeError(mutation.error, "campaign") : null}
          onClose={() => setConfirming(null)}
          onConfirm={() => void change(confirming)}
          pending={mutation.isPending}
          title="Complete this campaign?"
        />
      ) : null}
    </Stack>
  );
}
