"use client";

import { Stack } from "@mui/material";
import { RoutesResults } from "@/modules/routes/ui/RoutesResults";
import type { RecordScope } from "@/shared/api/field-schemas";
import { FilterSelect } from "@/shared/ui/FilterSelect";
import { scopeOptions, toScope } from "@/shared/ui/scope-options";
import { SectionPanel } from "@/shared/ui/SectionPanel";

type RoutesViewProps = Readonly<{ scope: RecordScope; selectedId: string | null; onSelect: (routeId: string) => void; onScopeChange: (scope: RecordScope) => void }>;

/** The routes, active or archived, with what each has produced. */
export function RoutesView({ scope, selectedId, onSelect, onScopeChange }: RoutesViewProps) {
  return (
    <SectionPanel title="Routes">
      <Stack sx={{ gap: 2 }}>
        <Stack direction="row"><FilterSelect label="Show" onChange={(value) => onScopeChange(toScope(value))} options={scopeOptions} value={scope} /></Stack>
        <RoutesResults onSelect={onSelect} onShowActive={() => onScopeChange("active")} scope={scope} selectedId={selectedId} />
      </Stack>
    </SectionPanel>
  );
}
