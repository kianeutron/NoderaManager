import { Stack } from "@mui/material";
import { followUpDueValues, type FollowUpSearchQuery } from "@/modules/followups/domain/followup.schema";
import { followUpDueLabel, followUpStatusLabel } from "@/modules/followups/ui/followup-presentation";
import { followUpStatusValues } from "@/shared/db/schema/crm-values";
import { FilterSelect } from "@/shared/ui/FilterSelect";

const statusOptions = followUpStatusValues.map((value) => ({ value, label: followUpStatusLabel[value] }));
const dueOptions = followUpDueValues.map((value) => ({ value, label: followUpDueLabel[value] }));

type FollowUpFilterBarProps = Readonly<{
  status: FollowUpSearchQuery["status"];
  due: FollowUpSearchQuery["due"];
  onChange: (patch: { followUpStatus?: FollowUpSearchQuery["status"]; followUpDue?: FollowUpSearchQuery["due"] }) => void;
}>;

/** Status picks the list; "due" narrows an active one, so it only appears there. */
export function FollowUpFilterBar({ status, due, onChange }: FollowUpFilterBarProps) {
  return (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
      <FilterSelect label="Show" onChange={(value) => onChange({ followUpStatus: statusOptions.find((option) => option.value === value)?.value ?? "active", followUpDue: undefined })} options={statusOptions} value={status} />
      {status === "active" ? <FilterSelect allLabel="Any due date" label="Due" onChange={(value) => onChange({ followUpDue: dueOptions.find((option) => option.value === value)?.value })} options={dueOptions} value={due ?? ""} /> : null}
    </Stack>
  );
}
