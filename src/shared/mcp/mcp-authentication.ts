import "server-only";
import { OAuthError, OAuthErrorCode, type AuthInfo, type OAuthTokenVerifier } from "@modelcontextprotocol/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { getMcpAuthorizationEnvironment, getServerEnvironment, type McpAuthorizationEnvironment } from "@/shared/config/server-env";
import { isOwnerEmail } from "@/shared/auth/owner-policy";

const accessTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  exp: z.number().int().positive(),
  scope: z.string().optional(),
  scp: z.array(z.string()).optional()
});

function getTokenScopes(claims: z.infer<typeof accessTokenClaimsSchema>): string[] {
  const spaceDelimitedScopes = claims.scope?.split(" ").filter(Boolean) ?? [];
  return [...new Set([...spaceDelimitedScopes, ...(claims.scp ?? [])])];
}

export function getMcpAuthorizationConfiguration(): McpAuthorizationEnvironment | null {
  return getMcpAuthorizationEnvironment();
}

export function getMcpResourceUrl(configuration: McpAuthorizationEnvironment): URL {
  return new URL("/mcp", configuration.NEXT_PUBLIC_APP_URL);
}

export function createMcpTokenVerifier(configuration: McpAuthorizationEnvironment): OAuthTokenVerifier {
  const keySet = createRemoteJWKSet(new URL(configuration.MCP_JWKS_URL));

  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      let payload: Record<string, unknown>;
      try {
        ({ payload } = await jwtVerify(token, keySet, {
          audience: configuration.MCP_AUDIENCE,
          issuer: configuration.MCP_ISSUER
        }));
      } catch {
        throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid access token");
      }

      const parsedClaims = accessTokenClaimsSchema.safeParse(payload);
      if (!parsedClaims.success || !isOwnerEmail(parsedClaims.data.email, getServerEnvironment().OWNER_EMAIL)) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, "Token is not authorized for this workspace");
      }

      return {
        token,
        clientId: parsedClaims.data.sub,
        scopes: getTokenScopes(parsedClaims.data),
        expiresAt: parsedClaims.data.exp,
        resource: getMcpResourceUrl(configuration),
        extra: { email: parsedClaims.data.email }
      };
    }
  };
}
