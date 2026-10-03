import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";
import { describeIssue } from "@/shared/ui/form/issue-messages";

/**
 * Validates a form with the server's own command schema, so a rule is written once. `toInput` maps form values to the
 * command input; issues land on the field they name (or the one `renames` maps it to, when the form's field is shaped differently from the command's), in plain language (`describeIssue`), and anything without a field of its own goes to `root`.
 */
export function commandResolver<Values extends FieldValues>(schema: z.ZodType, toInput: (values: Values) => unknown, fieldNames: readonly string[], renames: Readonly<Record<string, string>> = {}): Resolver<Values> {
  return (values) => {
    const result = schema.safeParse(toInput(values), { error: describeIssue });
    if (result.success) return { values, errors: {} };

    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const head = typeof issue.path[0] === "string" ? (renames[issue.path[0]] ?? issue.path[0]) : undefined;
      const name = head !== undefined && fieldNames.includes(head) ? head : "root";
      errors[name] ??= { type: issue.code, message: issue.message };
    }
    return { values: {}, errors: errors as FieldErrors<Values> };
  };
}
