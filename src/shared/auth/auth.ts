import "server-only";

import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { getDashboardAuthEnvironment, getServerEnvironment } from "@/shared/config/server-env";
import { authDatabase } from "@/shared/auth/auth-database";
import { isOwnerEmail } from "@/shared/auth/owner-policy";
import { mcpOfflineAccessScope, mcpReadScope, mcpWriteScope } from "@/shared/mcp/mcp-scopes";

const environment = getDashboardAuthEnvironment();
const ownerEmail = getServerEnvironment().OWNER_EMAIL;
const resource = new URL("/mcp", environment.NEXT_PUBLIC_APP_URL).href;
const googleCredentials = environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET ? {
  clientId: environment.GOOGLE_CLIENT_ID,
  clientSecret: environment.GOOGLE_CLIENT_SECRET,
  scope: ["openid", "email", "profile"]
} : undefined;

export const auth = betterAuth({
  appName: "Nodera",
  basePath: "/api/auth",
  baseURL: environment.NEXT_PUBLIC_APP_URL,
  database: authDatabase,
  secret: environment.BETTER_AUTH_SECRET,
  trustedOrigins: [environment.NEXT_PUBLIC_APP_URL],
  user: {
    validateUserInfo: ({ user }) => {
      if (typeof user.email !== "string" || !isOwnerEmail(user.email, ownerEmail)) {
        return { error: "owner_only", errorDescription: "This workspace is restricted to its configured owner." };
      }
    }
  },
  ...(googleCredentials ? {
    socialProviders: {
      google: googleCredentials
    }
  } : {}),
  plugins: [
    jwt(),
    mcp({
      loginPage: "/auth/sign-in",
      consentPage: "/auth/mcp-consent",
      resource,
      scopes: [mcpReadScope, mcpWriteScope, mcpOfflineAccessScope],
      clientRegistrationDefaultScopes: [mcpReadScope, mcpWriteScope, mcpOfflineAccessScope]
    }),
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28"
    }),
    nextCookies()
  ]
});

export { resource as mcpResource };
