import "server-only";
import { z } from "zod";

const emailSchema = z.email().transform((value) => value.trim().toLowerCase());

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url(),
  OWNER_EMAIL: emailSchema
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

const dashboardAuthEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional()
}).superRefine((value, context) => {
  if (Boolean(value.GOOGLE_CLIENT_ID) !== Boolean(value.GOOGLE_CLIENT_SECRET)) {
    context.addIssue({ code: "custom", message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together", path: ["GOOGLE_CLIENT_ID"] });
  }
});

export type DashboardAuthEnvironment = z.infer<typeof dashboardAuthEnvironmentSchema>;

export function getServerEnvironment(): ServerEnvironment {
  return serverEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    OWNER_EMAIL: process.env.OWNER_EMAIL
  });
}

export function getDashboardAuthEnvironment(): DashboardAuthEnvironment {
  return dashboardAuthEnvironmentSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
  });
}
