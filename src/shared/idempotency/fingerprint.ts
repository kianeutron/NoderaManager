import { createHash } from "node:crypto";

/** A stable hash of the parts that make two requests "the same one". Leave out anything a retry would legitimately change, such as a default timestamp. */
export function fingerprintOf(parts: readonly unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}
