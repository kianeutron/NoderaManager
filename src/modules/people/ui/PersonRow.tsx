import { Chip } from "@mui/material";
import type { PersonSummary } from "@/modules/people/domain/person.types";
import { personaLabel } from "@/modules/people/ui/person-presentation";
import { formatDate } from "@/shared/lib/format-date";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { EntityRow } from "@/shared/ui/EntityRow";

type PersonRowProps = Readonly<{ person: PersonSummary; selected: boolean; onSelect: () => void }>;

export function PersonRow({ person, selected, onSelect }: PersonRowProps) {
  const subtitle = [person.role, person.organization?.name].filter(Boolean).join(" · ");

  return (
    <EntityRow
      avatar={<EntityAvatar name={person.fullName} />}
      meta={(
        <>
          {person.doNotContact ? <Chip color="error" label="Do not contact" size="small" variant="outlined" /> : null}
          {person.persona ? <Chip label={personaLabel[person.persona]} size="small" variant="outlined" /> : null}
          {person.countryCode ? <Chip label={person.countryCode} size="small" variant="outlined" /> : null}
        </>
      )}
      onSelect={onSelect}
      selected={selected}
      subtitle={subtitle || null}
      title={person.fullName}
      trailing={person.lastContactedAt ? `Contacted ${formatDate(person.lastContactedAt)}` : "Not contacted"}
    />
  );
}
