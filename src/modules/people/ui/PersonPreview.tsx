import { Alert, Box, Chip, Link, Stack, Typography } from "@mui/material";
import type { PersonDetail } from "@/modules/people/domain/person.types";
import { personaLabel, personLinkTypeLabel } from "@/modules/people/ui/person-presentation";
import { ProspectsSection } from "@/modules/prospects/ui/ProspectsSection";
import { peopleKeys } from "@/modules/people/ui/use-people-queries";
import { NotesSection } from "@/modules/notes/ui/NotesSection";
import { formatDate } from "@/shared/lib/format-date";
import { ArchivedNotice } from "@/shared/ui/ArchivedNotice";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { FactList, PreviewSection } from "@/shared/ui/PreviewSection";

type PersonPreviewProps = Readonly<{ person: PersonDetail; onOpenOrganization: (organizationId: string) => void }>;

/** A prospect cannot be opened for someone archived or marked do not contact; saying why beats a disabled button. */
function prospectsUnavailableReason(person: PersonDetail): string | null {
  if (person.archivedAt) return "Restore this person to add prospects.";
  return person.doNotContact ? "Not available while this person is marked do not contact." : null;
}

export function PersonPreview({ person, onOpenOrganization }: PersonPreviewProps) {
  const location = [person.city, person.countryCode].filter(Boolean).join(", ");
  const facts = [
    person.persona ? { term: "Persona", value: personaLabel[person.persona] } : null,
    location ? { term: "Location", value: location } : null,
    person.languages.length > 0 ? { term: "Languages", value: person.languages.join(", ") } : null,
    { term: "Last contacted", value: person.lastContactedAt ? formatDate(person.lastContactedAt) : "Never" },
    { term: "Updated", value: formatDate(person.updatedAt) }
  ].filter((fact) => fact !== null);

  return (
    <Stack sx={{ gap: 3 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
        <EntityAvatar name={person.fullName} size={56} />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ overflowWrap: "anywhere" }} variant="h6">{person.fullName}</Typography>
          {person.role ? <Typography color="text.secondary" variant="body2">{person.role}</Typography> : null}
          {person.organization ? <Link component="button" onClick={() => onOpenOrganization(person.organization!.id)} sx={{ textAlign: "left" }} underline="hover" variant="body2">{person.organization.name}</Link> : null}
        </Box>
      </Stack>

      {person.archivedAt ? <ArchivedNotice archivedAt={person.archivedAt} /> : null}

      {person.doNotContact ? (
        <Alert severity="error">
          Do not contact{person.doNotContactAt ? ` since ${formatDate(person.doNotContactAt)}` : ""}.{person.doNotContactReason ? ` ${person.doNotContactReason}` : ""}
        </Alert>
      ) : null}

      <PreviewSection title="Details"><FactList facts={facts} /></PreviewSection>

      {person.emails.length > 0 ? (
        <PreviewSection title="Email">
          <Stack sx={{ gap: 0.75 }}>
            {person.emails.map(({ email, isPrimary }) => (
              <Stack direction="row" key={email} sx={{ alignItems: "center", gap: 1 }}>
                <Link href={`mailto:${email}`} sx={{ overflowWrap: "anywhere" }} variant="body2">{email}</Link>
                {isPrimary ? <Chip label="Primary" size="small" /> : null}
              </Stack>
            ))}
          </Stack>
        </PreviewSection>
      ) : null}

      {person.links.length > 0 ? (
        <PreviewSection title="Links">
          <Stack sx={{ gap: 0.75 }}>
            {person.links.map(({ type, url, label }) => (
              <Link href={url} key={url} rel="noopener noreferrer" sx={{ overflowWrap: "anywhere" }} target="_blank" variant="body2">{label ?? personLinkTypeLabel[type]}</Link>
            ))}
          </Stack>
        </PreviewSection>
      ) : null}

      <ProspectsSection prospects={person.prospects} subject={{ personId: person.id }} subjectLabel={person.fullName} unavailableReason={prospectsUnavailableReason(person)} />

      <NotesSection invalidateKey={peopleKeys.detail(person.id)} notes={person.recentNotes} targetId={person.id} targetType="person" />
    </Stack>
  );
}
