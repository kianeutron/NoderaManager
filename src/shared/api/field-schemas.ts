import { z } from "zod";
import { normalizeLinkedInUrl } from "@/shared/lib/linkedin-url";

// Field-level Zod pieces shared by more than one module's commands, so a country code or URL is validated one way everywhere.

/** ISO 3166-1 alpha-2, stored uppercase so the map and country statistics can group reliably. */
export const isoCountryCodeSchema = z.string().trim().length(2).transform((value) => value.toUpperCase()).pipe(z.string().regex(/^[A-Z]{2}$/, "Use a two-letter ISO country code"));

export const httpUrlSchema = z.url({ protocol: /^https?$/ }).max(500);

/** Accepts a LinkedIn profile or company URL and keeps it as entered; identity comparison uses `normalizeLinkedInUrl`. */
export const linkedInUrlSchema = httpUrlSchema.refine((value) => {
  try {
    normalizeLinkedInUrl(value);
    return true;
  } catch {
    return false;
  }
}, "Use a linkedin.com URL");

/** Display names: trimmed with inner whitespace collapsed. */
export const displayNameSchema = (maxLength: number) => z.string().transform((value) => value.trim().replace(/\s+/g, " ")).pipe(z.string().min(1).max(maxLength));

export const optionalTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);

/** Path parameter for routes addressed by record id. */
export const idParamSchema = z.object({ id: z.uuid() });

/** Which records a list shows: the live ones, or the archived ones (to find and restore). */
export const recordScopeSchema = z.enum(["active", "archived"]);
export type RecordScope = z.infer<typeof recordScopeSchema>;

/** An ISO timestamp on the wire (JSON has no dates, and tool schemas must be expressible as JSON Schema), a `Date` in the service. */
export const isoTimestampSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
