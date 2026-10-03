import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getServerEnvironment } from "@/shared/config/server-env";

export function getDatabase() {
  const sql = neon(getServerEnvironment().DATABASE_URL);
  return drizzle({ client: sql });
}
