import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ApiRequestError } from "@/shared/api/api-request-error";

/**
 * When the server rejects fields the browser's own validation let through (the two normally agree, so this is rare), mark
 * those inputs instead of leaving only a form-level notice. The server names fields, never wording, so the text is fixed.
 * Anything that is not a validation failure is left to the form's error notice (`describeError`).
 */
export function markInvalidFields<Values extends FieldValues>(form: Pick<UseFormReturn<Values>, "setError" | "getValues">, error: unknown): void {
  if (!(error instanceof ApiRequestError)) return;

  const known = form.getValues();
  for (const name of error.details.invalidFields ?? []) {
    if (name in known) form.setError(name as Path<Values>, { type: "server", message: "Check this value." });
  }
}
