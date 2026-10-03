/** Canonical form of a web URL for comparing links: no scheme difference, `www.`, fragment, trailing slash or `utm_*` tracking parameters. */
export function normalizeWebUrl(webUrl: string): string {
  const url = new URL(webUrl);
  const host = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");
  const parameters = [...url.searchParams].filter(([name]) => !name.toLocaleLowerCase("en-US").startsWith("utm_")).sort(([left], [right]) => left.localeCompare(right));
  const query = new URLSearchParams(parameters).toString();
  return `https://${host}${path}${query ? `?${query}` : ""}`;
}
