const isDefined = <Value>(value: Value): value is Exclude<Value, undefined> => value !== undefined;

/**
 * The subset of `keys` where the caller supplied a value that differs from the current one. An omitted field
 * (`undefined`) means "leave unchanged"; `null` is a real value (clear it). Compares scalars only.
 */
export function pickChangedFields<Current extends Record<string, unknown>, Input extends Record<string, unknown>, Key extends keyof Current & keyof Input & string>(current: Current, input: Input, keys: readonly Key[]): { [K in Key]?: Exclude<Input[K], undefined> } {
  const changes: { [K in Key]?: Exclude<Input[K], undefined> } = {};
  for (const key of keys) {
    const next = input[key];
    if (isDefined(next) && next !== current[key]) changes[key] = next;
  }
  return changes;
}
