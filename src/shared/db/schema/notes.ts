import { sql } from "drizzle-orm";
import { check, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tsvector, updatedAt } from "./columns";
import { organizations, people, prospects } from "./core";

export const notes = pgTable("notes", {
  id: id(),
  body: text("body").notNull(),
  searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('simple', body)`),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("notes_body_length", sql`char_length(${table.body}) between 1 and 10000`),
  index("notes_search_vector_index").using("gin", table.searchVector)
]);

/** Person/Org/Prospect * --- * Note. Explicit nullable foreign keys keep integrity; exactly one target per row. */
export const noteLinks = pgTable("note_links", {
  id: id(),
  noteId: uuid("note_id").notNull().references(() => notes.id, { onDelete: "restrict" }),
  personId: uuid("person_id").references(() => people.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  prospectId: uuid("prospect_id").references(() => prospects.id, { onDelete: "restrict" }),
  createdAt: createdAt()
}, (table) => [
  check("note_links_single_target", sql`num_nonnulls(${table.personId}, ${table.organizationId}, ${table.prospectId}) = 1`),
  uniqueIndex("note_links_person_unique").on(table.noteId, table.personId).where(sql`${table.personId} is not null`),
  uniqueIndex("note_links_organization_unique").on(table.noteId, table.organizationId).where(sql`${table.organizationId} is not null`),
  uniqueIndex("note_links_prospect_unique").on(table.noteId, table.prospectId).where(sql`${table.prospectId} is not null`),
  index("note_links_person_id_index").on(table.personId),
  index("note_links_organization_id_index").on(table.organizationId),
  index("note_links_prospect_id_index").on(table.prospectId)
]);
