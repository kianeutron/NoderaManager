/** Up to two capital letters for an avatar: first and last word of a name. Falls back to "?" for empty text. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0];
  const last = words.length > 1 ? words.at(-1)?.[0] : undefined;
  return `${first ?? "?"}${last ?? ""}`.toLocaleUpperCase("en-US");
}
