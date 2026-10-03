import { z } from "zod";
import { normalizeText } from "@/shared/lib/normalize-text";

export const maxTagsPerDocument = 10;

const tagNameSchema = z.string().transform((value) => value.trim().replace(/\s+/g, " ")).pipe(z.string().min(1).max(40));

function dedupeByNormalizedName(names: readonly string[]): string[] {
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = normalizeText(name);
    return !seen.has(key) && seen.add(key);
  });
}

export const tagListSchema = z.array(tagNameSchema).transform(dedupeByNormalizedName).pipe(z.array(z.string()).max(maxTagsPerDocument));
