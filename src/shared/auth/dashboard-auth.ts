import "server-only";
import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";
import { z } from "zod";
import { getDashboardAuthEnvironment } from "@/shared/config/server-env";

const dashboardIdentitySchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().nullish()
});

export type DashboardIdentity = z.infer<typeof dashboardIdentitySchema>;

export function getDashboardAuth() {
  const environment = getDashboardAuthEnvironment();

  return createNeonAuth({
    baseUrl: environment.NEON_AUTH_BASE_URL,
    cookies: { secret: environment.NEON_AUTH_COOKIE_SECRET },
    logLevel: "silent"
  });
}

export async function getDashboardIdentity(): Promise<DashboardIdentity | null> {
  const { data, error } = await getDashboardAuth().getSession();
  if (error || !data?.user) return null;

  const parsedIdentity = dashboardIdentitySchema.safeParse(data.user);
  return parsedIdentity.success ? parsedIdentity.data : null;
}
