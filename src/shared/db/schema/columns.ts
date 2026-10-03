import { customType, timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

export const id = () => uuid("id").primaryKey().$defaultFn(uuidv7);
export const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
export const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/** Postgres full-text vector, used only as a generated column. */
export const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
