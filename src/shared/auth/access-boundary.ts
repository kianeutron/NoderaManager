import { randomUUID } from "node:crypto";
import { getDashboardIdentity } from "@/shared/auth/dashboard-auth";
import { isOwnerEmail } from "@/shared/auth/owner-policy";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { getServerEnvironment } from "@/shared/config/server-env";

export class AccessBoundaryError extends Error {
  public constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required" : "Access denied");
  }
}

export async function requireDashboardOwner(): Promise<AuthenticatedActor> {
  const identity = await getDashboardIdentity();
  if (!identity) throw new AccessBoundaryError(401);
  if (!isOwnerEmail(identity.email, getServerEnvironment().OWNER_EMAIL)) throw new AccessBoundaryError(403);

  return {
    id: identity.id,
    type: "user",
    requestId: randomUUID(),
    source: "dashboard"
  };
}
