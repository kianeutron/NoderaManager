import type { NoteView } from "@/modules/notes/domain/note.types";
import type { KeysetPage } from "@/shared/api/keyset";
import type { prospectSourceValues, prospectStatusValues, prospectTemperatureValues, signalTypeValues, structuralReasonValues } from "@/shared/db/schema/crm-values";

export type ProspectStatus = (typeof prospectStatusValues)[number];
export type ProspectTemperature = (typeof prospectTemperatureValues)[number];
export type ProspectSource = (typeof prospectSourceValues)[number];
export type StructuralReason = (typeof structuralReasonValues)[number];
export type SignalType = (typeof signalTypeValues)[number];

export type ProspectSummary = Readonly<{
  id: string;
  status: ProspectStatus;
  temperature: ProspectTemperature | null;
  person: Readonly<{ id: string; fullName: string }> | null;
  organization: Readonly<{ id: string; name: string }> | null;
  route: Readonly<{ id: string; name: string }>;
  module: Readonly<{ id: string; name: string }> | null;
  nextAction: string | null;
  lastContactedAt: string | null;
  updatedAt: string;
}>;

export type ProspectPage = KeysetPage<ProspectSummary>;

export type SignalView = Readonly<{ id: string; type: SignalType; summary: string; sourceUrl: string | null; observedAt: string; expiresAt: string | null }>;

export type ProspectDetail = ProspectSummary & Readonly<{
  source: ProspectSource | null;
  whyTargeted: string | null;
  currentTrigger: string | null;
  structuralReason: StructuralReason | null;
  statusChangedAt: string;
  signals: readonly SignalView[];
  recentNotes: readonly NoteView[];
}>;

type Audited = Readonly<{ auditEventId: string | null }>;

export type CreateProspectResult = Audited & Readonly<{ prospectId: string; created: boolean }>;
export type UpdateProspectResult = Audited & Readonly<{ prospectId: string; changed: boolean }>;
export type UpdateProspectStatusResult = Audited & Readonly<{ prospectId: string; status: ProspectStatus; previousStatus: ProspectStatus; changed: boolean }>;
export type AddSignalResult = Audited & Readonly<{ signalId: string; created: boolean }>;
