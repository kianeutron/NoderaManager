import type { ProspectSummary } from "@/modules/prospects/domain/prospect.types";

type ProspectSummaryRow = Readonly<{
  id: string;
  status: ProspectSummary["status"];
  temperature: ProspectSummary["temperature"];
  personId: string | null;
  personName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  routeId: string;
  routeName: string;
  moduleId: string | null;
  moduleName: string | null;
  nextAction: string | null;
  lastContactedAt: Date | null;
  updatedAt: Date;
}>;

export function toProspectSummary(row: ProspectSummaryRow): ProspectSummary {
  return {
    id: row.id,
    status: row.status,
    temperature: row.temperature,
    person: row.personId && row.personName ? { id: row.personId, fullName: row.personName } : null,
    organization: row.organizationId && row.organizationName ? { id: row.organizationId, name: row.organizationName } : null,
    route: { id: row.routeId, name: row.routeName },
    module: row.moduleId && row.moduleName ? { id: row.moduleId, name: row.moduleName } : null,
    nextAction: row.nextAction,
    lastContactedAt: row.lastContactedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString()
  };
}
