/** Escapes LIKE/ILIKE wildcards so user input is matched literally (Postgres uses `\` as the default escape). */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
