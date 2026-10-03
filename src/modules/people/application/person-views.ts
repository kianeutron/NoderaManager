import type { PersonSummary } from "@/modules/people/domain/person.types";

type PersonSummaryRow = Readonly<{
  id: string;
  fullName: string;
  role: string | null;
  persona: PersonSummary["persona"];
  organizationId: string | null;
  organizationName: string | null;
  countryCode: string | null;
  city: string | null;
  lastContactedAt: Date | null;
  doNotContactAt: Date | null;
  updatedAt: Date;
}>;

export function toPersonSummary(row: PersonSummaryRow): PersonSummary {
  return {
    id: row.id,
    fullName: row.fullName,
    role: row.role,
    persona: row.persona,
    organization: row.organizationId && row.organizationName ? { id: row.organizationId, name: row.organizationName } : null,
    countryCode: row.countryCode,
    city: row.city,
    lastContactedAt: row.lastContactedAt?.toISOString() ?? null,
    doNotContact: row.doNotContactAt !== null,
    updatedAt: row.updatedAt.toISOString()
  };
}
