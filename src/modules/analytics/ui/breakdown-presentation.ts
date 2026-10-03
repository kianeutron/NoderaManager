import type { PerformanceDimension } from "@/modules/analytics/domain/analytics.schema";
import type { PerformanceRow } from "@/modules/analytics/domain/analytics.types";
import { organizationTypeLabel } from "@/modules/organizations/ui/organization-presentation";
import { channelLabel } from "@/modules/outreach/ui/outreach-presentation";
import { personaLabel } from "@/modules/people/ui/person-presentation";
import { sourceLabel } from "@/modules/prospects/ui/prospect-presentation";

export const dimensionLabel = {
  route: "Route", module: "Module", persona: "Persona", country: "Country", organizationType: "Company type", channel: "Channel", campaign: "Campaign", source: "Source"
} as const satisfies Record<PerformanceDimension, string>;

/** What a group is called when the dimension is not recorded for it. */
const notRecorded = { route: "No route", module: "No module", persona: "Persona not set", country: "Country not set", organizationType: "Company type not set", channel: "Unknown channel", campaign: "No campaign", source: "Source not set" } as const satisfies Record<PerformanceDimension, string>;

const regionNames = new Intl.DisplayNames("en", { type: "region" });
const countryName = (code: string): string => {
  try { return regionNames.of(code) ?? code; } catch { return code; }
};

// A value outside the known lists (a new enum value the screen has not learned yet) is shown as it is rather than hidden.
const lookup = (labels: Readonly<Record<string, string>>, key: string) => labels[key] ?? key;

/** How a group is worded: records by their name, fixed values by the label the rest of the app uses. */
export function rowLabel(dimension: PerformanceDimension, { key, name }: Pick<PerformanceRow, "key" | "name">): string {
  if (key === null) return notRecorded[dimension];
  switch (dimension) {
    case "route": case "module": case "campaign": return name ?? key;
    case "persona": return lookup(personaLabel, key);
    case "country": return countryName(key);
    case "organizationType": return lookup(organizationTypeLabel, key);
    case "channel": return lookup(channelLabel, key);
    case "source": return lookup(sourceLabel, key);
  }
}
