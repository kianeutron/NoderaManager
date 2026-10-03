import "server-only";
import { z } from "zod";

const emailSchema = z.email().transform((value) => value.trim().toLowerCase());

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url(),
  OWNER_EMAIL: emailSchema
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

const dashboardAuthEnvironmentSchema = z.object({
  NEON_AUTH_BASE_URL: z.url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32)
});

export type DashboardAuthEnvironment = z.infer<typeof dashboardAuthEnvironmentSchema>;

const mcpAuthorizationEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  MCP_AUTHORIZATION_SERVER: z.url(),
  MCP_JWKS_URL: z.url(),
  MCP_ISSUER: z.url(),
  MCP_AUDIENCE: z.string().min(1)
});

export type McpAuthorizationEnvironment = z.infer<typeof mcpAuthorizationEnvironmentSchema>;

export function getServerEnvironment(): ServerEnvironment {
  return serverEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    OWNER_EMAIL: process.env.OWNER_EMAIL
  });
}

export function getDashboardAuthEnvironment(): DashboardAuthEnvironment {
  return dashboardAuthEnvironmentSchema.parse({
    NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
    NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET
  });
}

export function getMcpAuthorizationEnvironment(): McpAuthorizationEnvironment | null {
  const parsed = mcpAuthorizationEnvironmentSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    MCP_AUTHORIZATION_SERVER: process.env.MCP_AUTHORIZATION_SERVER,
    MCP_JWKS_URL: process.env.MCP_JWKS_URL,
    MCP_ISSUER: process.env.MCP_ISSUER,
    MCP_AUDIENCE: process.env.MCP_AUDIENCE
  });

  return parsed.success ? parsed.data : null;
}
