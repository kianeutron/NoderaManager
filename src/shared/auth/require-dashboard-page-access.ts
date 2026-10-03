import "server-only";
import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/shared/auth/dashboard-auth";
import { isOwnerEmail } from "@/shared/auth/owner-policy";
import { getServerEnvironment } from "@/shared/config/server-env";

/** Page-level counterpart of `requireDashboardOwner`: redirects instead of throwing. */
export async function requireDashboardPageAccess(): Promise<void> {
  const identity = await getDashboardIdentity();
  if (!identity) redirect("/auth/sign-in");
  if (!isOwnerEmail(identity.email, getServerEnvironment().OWNER_EMAIL)) redirect("/auth/forbidden");
}
