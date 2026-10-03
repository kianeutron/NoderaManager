import type { ValidationTargets } from "hono";
import { validator } from "hono/validator";
import type { z } from "zod";

/** Validates a request part with a Zod schema. A failure is thrown as a `ZodError`, which `handleApiError` turns into the API's stable 400 shape. */
export function zodValidator<Target extends keyof ValidationTargets, Schema extends z.ZodType>(target: Target, schema: Schema) {
  return validator(target, (value) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw parsed.error;

    return parsed.data;
  });
}
