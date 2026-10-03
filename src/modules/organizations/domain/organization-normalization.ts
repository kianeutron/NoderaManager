import { z } from "zod";

/** The canonical comparison form of a website or domain: lowercase host without `www.`. Throws for anything that is not a URL. */
export function normalizeOrganizationDomain(domainOrUrl: string): string {
  const candidate = domainOrUrl.includes("://") ? domainOrUrl : `https://${domainOrUrl}`;
  const host = new URL(candidate).hostname.toLocaleLowerCase("en-US");
  return host.replace(/^www\./, "");
}

/** A domain as accepted from callers (a bare domain or a URL), stored in canonical form. */
export const organizationDomainSchema = z.string().trim().min(3).max(253).transform((value, context) => {
  try {
    const domain = normalizeOrganizationDomain(value);
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return domain;
  } catch {
    // fall through to the issue below
  }
  context.addIssue({ code: "custom", message: "Enter a domain such as bluewave.io" });
  return z.NEVER;
});

/** Preserves order (the first domain is canonical) and drops repeats. */
export function dedupeDomains(domains: readonly string[]): string[] {
  return [...new Set(domains)];
}
