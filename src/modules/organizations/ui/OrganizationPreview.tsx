import BusinessRounded from "@mui/icons-material/BusinessRounded";
import { Box, Chip, Link, Stack, Typography } from "@mui/material";
import type { OrganizationDetail } from "@/modules/organizations/domain/organization.types";
import { organizationTypeLabel, sizeBandLabel } from "@/modules/organizations/ui/organization-presentation";
import { ProspectsSection } from "@/modules/prospects/ui/ProspectsSection";
import { organizationKeys } from "@/modules/organizations/ui/use-organization-queries";
import { NotesSection } from "@/modules/notes/ui/NotesSection";
import { formatDate } from "@/shared/lib/format-date";
import { ArchivedNotice } from "@/shared/ui/ArchivedNotice";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { FactList, PreviewSection } from "@/shared/ui/PreviewSection";

type OrganizationPreviewProps = Readonly<{ organization: OrganizationDetail; onOpenPerson: (personId: string) => void }>;

export function OrganizationPreview({ organization, onOpenPerson }: OrganizationPreviewProps) {
  const facts = [
    { term: "Type", value: organizationTypeLabel[organization.organizationType] },
    organization.industry ? { term: "Industry", value: organization.industry } : null,
    organization.sizeBand ? { term: "Size", value: sizeBandLabel[organization.sizeBand] } : null,
    organization.countryCode ? { term: "Country", value: organization.countryCode } : null,
    { term: "Updated", value: formatDate(organization.updatedAt) }
  ].filter((fact) => fact !== null);

  return (
    <Stack sx={{ gap: 3 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
        <EntityAvatar icon={<BusinessRounded />} name={organization.name} size={56} />
        <Typography component="h2" sx={{ overflowWrap: "anywhere" }} variant="h6">{organization.name}</Typography>
      </Stack>

      {organization.archivedAt ? <ArchivedNotice archivedAt={organization.archivedAt} /> : null}

      <PreviewSection title="Details"><FactList facts={facts} /></PreviewSection>

      {organization.notes ? <PreviewSection title="About"><Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} variant="body2">{organization.notes}</Typography></PreviewSection> : null}

      {organization.domains.length > 0 ? (
        <PreviewSection title="Domains">
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
            {organization.domains.map(({ domain, isCanonical }) => <Chip color={isCanonical ? "primary" : "default"} key={domain} label={domain} size="small" variant="outlined" />)}
          </Stack>
        </PreviewSection>
      ) : null}

      {organization.people.length > 0 ? (
        <PreviewSection title="People">
          <Stack sx={{ gap: 0.5 }}>
            {organization.people.map((person) => (
              <Link component="button" key={person.id} onClick={() => onOpenPerson(person.id)} sx={{ textAlign: "left" }} underline="hover" variant="body2">
                {person.fullName}{person.role ? ` · ${person.role}` : ""}
              </Link>
            ))}
          </Stack>
        </PreviewSection>
      ) : null}

      <ProspectsSection prospects={organization.prospects} subject={{ organizationId: organization.id }} subjectLabel={organization.name} unavailableReason={organization.archivedAt ? "Restore this company to add prospects." : null} />

      <NotesSection invalidateKey={organizationKeys.detail(organization.id)} notes={organization.recentNotes} targetId={organization.id} targetType="organization" />
    </Stack>
  );
}
