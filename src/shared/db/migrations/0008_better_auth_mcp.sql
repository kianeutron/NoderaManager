CREATE SCHEMA IF NOT EXISTS "auth";

CREATE TABLE "auth"."user" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL,
  "image" text,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "auth"."session" (
  "id" text NOT NULL PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "auth"."user" ("id") ON DELETE CASCADE
);

CREATE TABLE "auth"."account" (
  "id" text NOT NULL PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE "auth"."verification" (
  "id" text NOT NULL PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "auth"."jwks" (
  "id" text NOT NULL PRIMARY KEY,
  "publicKey" text NOT NULL,
  "privateKey" text NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "expiresAt" timestamptz,
  "alg" text,
  "crv" text
);

CREATE TABLE "auth"."oauthClient" (
  "id" text NOT NULL PRIMARY KEY,
  "clientId" text NOT NULL UNIQUE,
  "clientSecret" text,
  "clientDiscoveryId" text,
  "disabled" boolean,
  "skipConsent" boolean,
  "enableEndSession" boolean,
  "subjectType" text,
  "scopes" jsonb,
  "clientCredentialsScopes" jsonb,
  "userId" text REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  "name" text,
  "uri" text,
  "icon" text,
  "contacts" jsonb,
  "tos" text,
  "policy" text,
  "softwareId" text,
  "softwareVersion" text,
  "softwareStatement" text,
  "redirectUris" jsonb NOT NULL,
  "postLogoutRedirectUris" jsonb,
  "backchannelLogoutUri" text,
  "backchannelLogoutSessionRequired" boolean,
  "tokenEndpointAuthMethod" text,
  "applicationType" text,
  "jwks" text,
  "jwksUri" text,
  "grantTypes" jsonb,
  "responseTypes" jsonb,
  "requirePKCE" boolean,
  "dpopBoundAccessTokens" boolean,
  "referenceId" text,
  "metadata" jsonb
);

CREATE TABLE "auth"."oauthResource" (
  "id" text NOT NULL PRIMARY KEY,
  "identifier" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "accessTokenTtl" integer,
  "refreshTokenTtl" integer,
  "signingAlgorithm" text,
  "signingKeyId" text,
  "allowedScopes" jsonb,
  "customClaims" jsonb,
  "dpopBoundAccessTokensRequired" boolean,
  "disabled" boolean,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  "policyVersion" integer,
  "metadata" jsonb
);

CREATE TABLE "auth"."oauthClientResource" (
  "id" text NOT NULL PRIMARY KEY,
  "clientId" text NOT NULL REFERENCES "auth"."oauthClient" ("clientId") ON DELETE CASCADE,
  "resourceId" text NOT NULL REFERENCES "auth"."oauthResource" ("identifier") ON DELETE CASCADE,
  "metadata" jsonb,
  "createdAt" timestamptz
);

CREATE TABLE "auth"."oauthRefreshToken" (
  "id" text NOT NULL PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "clientId" text NOT NULL REFERENCES "auth"."oauthClient" ("clientId") ON DELETE CASCADE,
  "sessionId" text REFERENCES "auth"."session" ("id") ON DELETE SET NULL,
  "userId" text NOT NULL REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
  "referenceId" text,
  "authorizationCodeId" text,
  "resources" jsonb,
  "requestedUserInfoClaims" jsonb,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "revoked" timestamptz,
  "rotatedAt" timestamptz,
  "rotationReplayResponse" text,
  "rotationReplayExpiresAt" timestamptz,
  "authTime" timestamptz,
  "confirmation" jsonb,
  "scopes" jsonb NOT NULL
);

CREATE TABLE "auth"."oauthAccessToken" (
  "id" text NOT NULL PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "clientId" text NOT NULL REFERENCES "auth"."oauthClient" ("clientId") ON DELETE CASCADE,
  "sessionId" text REFERENCES "auth"."session" ("id") ON DELETE SET NULL,
  "userId" text REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
  "referenceId" text,
  "authorizationCodeId" text,
  "resources" jsonb,
  "requestedUserInfoClaims" jsonb,
  "refreshId" text REFERENCES "auth"."oauthRefreshToken" ("id") ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "revoked" timestamptz,
  "confirmation" jsonb,
  "scopes" jsonb NOT NULL
);

CREATE TABLE "auth"."oauthConsent" (
  "id" text NOT NULL PRIMARY KEY,
  "clientId" text NOT NULL REFERENCES "auth"."oauthClient" ("clientId") ON DELETE CASCADE,
  "userId" text REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
  "referenceId" text,
  "resources" jsonb,
  "requestedUserInfoClaims" jsonb,
  "scopes" jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE "auth"."oauthClientAssertion" (
  "id" text NOT NULL PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL
);

CREATE INDEX "session_userId_idx" ON "auth"."session" ("userId");
CREATE INDEX "account_userId_idx" ON "auth"."account" ("userId");
CREATE INDEX "verification_identifier_idx" ON "auth"."verification" ("identifier");
CREATE INDEX "oauthClient_userId_idx" ON "auth"."oauthClient" ("userId");
CREATE INDEX "oauthClientResource_clientId_idx" ON "auth"."oauthClientResource" ("clientId");
CREATE INDEX "oauthClientResource_resourceId_idx" ON "auth"."oauthClientResource" ("resourceId");
CREATE INDEX "oauthRefreshToken_clientId_idx" ON "auth"."oauthRefreshToken" ("clientId");
CREATE INDEX "oauthRefreshToken_sessionId_idx" ON "auth"."oauthRefreshToken" ("sessionId");
CREATE INDEX "oauthRefreshToken_userId_idx" ON "auth"."oauthRefreshToken" ("userId");
CREATE INDEX "oauthRefreshToken_authorizationCodeId_idx" ON "auth"."oauthRefreshToken" ("authorizationCodeId");
CREATE INDEX "oauthAccessToken_clientId_idx" ON "auth"."oauthAccessToken" ("clientId");
CREATE INDEX "oauthAccessToken_sessionId_idx" ON "auth"."oauthAccessToken" ("sessionId");
CREATE INDEX "oauthAccessToken_userId_idx" ON "auth"."oauthAccessToken" ("userId");
CREATE INDEX "oauthAccessToken_authorizationCodeId_idx" ON "auth"."oauthAccessToken" ("authorizationCodeId");
CREATE INDEX "oauthAccessToken_refreshId_idx" ON "auth"."oauthAccessToken" ("refreshId");
CREATE INDEX "oauthConsent_clientId_idx" ON "auth"."oauthConsent" ("clientId");
CREATE INDEX "oauthConsent_userId_idx" ON "auth"."oauthConsent" ("userId");
