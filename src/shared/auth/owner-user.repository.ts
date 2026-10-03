import type { getDatabase } from "@/shared/db/client";
import { users } from "@/shared/db/schema/core";

/**
 * The app has one owner. Domain rows reference `users`, so the owner's row is created on first use.
 * `ownerEmail` must already be normalized (server-env lowercases it), which is what the unique index compares.
 */
export async function ensureOwnerUserId(database: ReturnType<typeof getDatabase>, ownerEmail: string): Promise<string> {
  const [row] = await database.insert(users).values({ email: ownerEmail, normalizedEmail: ownerEmail, displayName: "Owner" })
    .onConflictDoUpdate({ target: users.normalizedEmail, set: { email: ownerEmail } })
    .returning({ id: users.id });

  if (!row) throw new Error("Owner user could not be resolved");
  return row.id;
}
