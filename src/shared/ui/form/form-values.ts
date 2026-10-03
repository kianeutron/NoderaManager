/** Blank text means "not provided" when creating. */
export const blankToUndefined = (value: string): string | undefined => value.trim() || undefined;

/** For edits: `undefined` is unchanged, `null` clears, anything else is the new value. */
export function diffText(current: string, initial: string): string | null | undefined {
  if (current.trim() === initial.trim()) return undefined;
  return current.trim() || null;
}

export function diffList(current: readonly string[], initial: readonly string[]): string[] | undefined {
  return current.length === initial.length && current.every((item, index) => item === initial[index]) ? undefined : [...current];
}

/** Drops keys whose value is `undefined`, so a diff serializes to only what changed. */
export function definedEntries<Shape extends Record<string, unknown>>(shape: Shape): Partial<Shape> {
  return Object.fromEntries(Object.entries(shape).filter(([, value]) => value !== undefined)) as Partial<Shape>;
}
