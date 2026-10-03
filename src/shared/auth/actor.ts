import type { actorTypeValues } from "@/shared/db/schema/core";

export type ActorType = (typeof actorTypeValues)[number];

export type AuthenticatedActor = Readonly<{
  id: string;
  type: ActorType;
  requestId: string;
  source: string;
}>;
