/** The query string of a server page (`searchParams`) as `URLSearchParams`, so the same codecs that read the browser's URL can read it. */
export function toUrlSearchParams(record: Readonly<Record<string, string | readonly string[] | undefined>>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") params.set(key, value);
    else if (value) for (const item of value) params.append(key, item);
  }
  return params;
}
