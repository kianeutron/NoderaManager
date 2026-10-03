import type { z } from "zod";

const quote = (value: unknown) => (typeof value === "string" ? `"${value}"` : "That value");

/**
 * Plain-language wording for validation issues, used as the parse-level error map: a message a schema author wrote
 * ("Use a linkedin.com URL") always wins; only Zod's stock English ("Too small: expected string to have >=1 characters")
 * is replaced. For a list item the message names the offending value.
 */
export function describeIssue(issue: z.core.$ZodRawIssue): string {
  const isListItem = typeof issue.path?.at(-1) === "number";

  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined || issue.input === null ? "This is required." : "This value isn't valid.";
    case "too_small":
      if (issue.origin === "array") return "Add at least one.";
      return issue.minimum === 1 || issue.minimum === 1n ? "This is required." : `Use at least ${String(issue.minimum)} characters.`;
    case "too_big":
      return issue.origin === "array" ? `Add at most ${String(issue.maximum)}.` : `Use at most ${String(issue.maximum)} characters.`;
    case "invalid_format":
      if (issue.format === "email") return isListItem ? `${quote(issue.input)} isn't a valid email address.` : "Enter a valid email address.";
      if (issue.format === "url") return "Enter a valid web address, starting with https://";
      return isListItem ? `${quote(issue.input)} isn't in a valid format.` : "This isn't in a valid format.";
    case "invalid_value":
      return "Choose one of the available options.";
    default:
      return "This value isn't valid.";
  }
}
