import "server-only";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/shared/auth/auth";

const dashboardIdentitySchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().nullish()
});

export type DashboardIdentity = z.infer<typeof dashboardIdentitySchema>;

export { auth as getDashboardAuth };

export async function getDashboardIdentity(): Promise<DashboardIdentity | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const parsedIdentity = dashboardIdentitySchema.safeParse(session.user);
  return parsedIdentity.success ? parsedIdentity.data : null;
}
