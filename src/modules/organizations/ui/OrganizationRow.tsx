import BusinessRounded from "@mui/icons-material/BusinessRounded";
import { Chip } from "@mui/material";
import type { OrganizationSummary } from "@/modules/organizations/domain/organization.types";
import { organizationTypeLabel, sizeBandLabel } from "@/modules/organizations/ui/organization-presentation";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { EntityRow } from "@/shared/ui/EntityRow";

type OrganizationRowProps = Readonly<{ organization: OrganizationSummary; selected: boolean; onSelect: () => void }>;

export function OrganizationRow({ organization, selected, onSelect }: OrganizationRowProps) {
  return (
    <EntityRow
      avatar={<EntityAvatar icon={<BusinessRounded fontSize="small" />} name={organization.name} />}
      meta={(
        <>
          <Chip label={organizationTypeLabel[organization.organizationType]} size="small" variant="outlined" />
          {organization.sizeBand ? <Chip label={sizeBandLabel[organization.sizeBand]} size="small" variant="outlined" /> : null}
          {organization.countryCode ? <Chip label={organization.countryCode} size="small" variant="outlined" /> : null}
        </>
      )}
      onSelect={onSelect}
      selected={selected}
      subtitle={[organization.industry, organization.canonicalDomain].filter(Boolean).join(" · ") || null}
      title={organization.name}
    />
  );
}
