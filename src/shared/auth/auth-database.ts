import "server-only";

import { Pool } from "pg";
import { PostgresDialect } from "kysely";
import { getServerEnvironment } from "@/shared/config/server-env";

const pool = new Pool({
  connectionString: getServerEnvironment().DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000
});

export const authDatabase = {
  dialect: new PostgresDialect({ pool }),
  type: "postgres" as const,
  schemaName: "auth",
  transaction: false
};
