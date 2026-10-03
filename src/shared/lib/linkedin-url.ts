/** Canonical form of a LinkedIn profile or company URL: no query, fragment, `www.` or trailing slash. Throws for other hosts. */
export function normalizeLinkedInUrl(linkedInUrl: string): string {
  const url = new URL(linkedInUrl);
  const host = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  if (host !== "linkedin.com") throw new Error("LinkedIn URLs must use linkedin.com.");
  const path = url.pathname.replace(/\/+$/, "").toLocaleLowerCase("en-US");
  return `https://${host}${path}`;
}
