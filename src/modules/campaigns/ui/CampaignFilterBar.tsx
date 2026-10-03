import { Stack } from "@mui/material";
import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";
import { campaignStatusMeta } from "@/modules/campaigns/ui/campaign-presentation";
import type { RecordScope } from "@/shared/api/field-schemas";
import { campaignStatusValues } from "@/shared/db/schema/crm-values";
import { FilterSelect } from "@/shared/ui/FilterSelect";
import { scopeOptions, toScope } from "@/shared/ui/scope-options";

const statusOptions = campaignStatusValues.map((value) => ({ value, label: campaignStatusMeta[value].label }));

type CampaignFilterBarProps = Readonly<{
  status: CampaignStatus | undefined;
  scope: RecordScope;
  onChange: (patch: { status?: CampaignStatus | undefined; scope?: RecordScope }) => void;
}>;

export function CampaignFilterBar({ status, scope, onChange }: CampaignFilterBarProps) {
  return (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
      <FilterSelect allLabel="Any status" label="Status" onChange={(value) => onChange({ status: statusOptions.find((option) => option.value === value)?.value })} options={statusOptions} value={status ?? ""} />
      <FilterSelect label="Show" onChange={(value) => onChange({ scope: toScope(value) })} options={scopeOptions} value={scope} />
    </Stack>
  );
}
