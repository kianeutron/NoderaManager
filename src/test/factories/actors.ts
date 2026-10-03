import type { AuthenticatedActor } from "@/shared/auth/actor";

export function createActor(overrides: Partial<AuthenticatedActor> = {}): AuthenticatedActor {
  return { id: "actor-1", type: "mcp", requestId: "request-1", source: "mcp", ...overrides };
}
