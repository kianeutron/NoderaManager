import type { McpServer } from "@modelcontextprotocol/server";
import type { PeopleServices } from "@/modules/people/application/create-people-services";
import { createPersonInputSchema, markDoNotContactInputSchema, personIdInputSchema, personIdentitySchema, personSearchQuerySchema, setPersonEmailsInputSchema, setPersonLinksInputSchema, updatePersonInputSchema } from "@/modules/people/domain/person.schema";
import { ApplicationError } from "@/shared/errors/application-error";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { actorOf, readOnlyTool, writeTool } from "@/shared/mcp/tool-metadata";

export function registerPeopleTools(server: McpServer, people: PeopleServices): void {
  server.registerTool("find_duplicate_candidates", {
    ...readOnlyTool("Find duplicate people", "Finds people who may be the same as the one described, ranked exact (same email or LinkedIn profile), strong (same name and organization or domain) or weak (same name only). Run this before proposing a new person; create_person runs the same check itself."),
    inputSchema: personIdentitySchema
  }, (identity) => runMcpTool("find_duplicate_candidates", async () => ({ candidates: await people.findDuplicateCandidates(identity) })));

  server.registerTool("search_people", {
    ...readOnlyTool("Search people", "Lists people, most recently updated first or by name. Filter by text (name, email or LinkedIn URL), organization id, persona or ISO country code. Set scope to archived to list archived people (to find one to restore). Returns compact rows; pass `nextCursor` back as `cursor` for the next page."),
    inputSchema: personSearchQuerySchema
  }, (query) => runMcpTool("search_people", () => people.searchPeople(query)));

  server.registerTool("get_person", {
    ...readOnlyTool("Get a person", "Returns one person (archived ones too) with emails, links, organization, prospects, do-not-contact status, archivedAt and recent notes."),
    inputSchema: personIdInputSchema
  }, ({ personId }) => runMcpTool("get_person", async () => {
    const person = await people.getPerson(personId);
    if (!person) throw new ApplicationError("not_found", "Person not found");
    return { person };
  }));

  server.registerTool("create_person", {
    ...writeTool("Create a person", "Creates a person after running the shared duplicate check. An exact match (same email or LinkedIn profile) blocks creation and the error names the existing person. A strong match (same name and organization) blocks unless confirmNewIdentity is true. Weaker matches are returned as possibleDuplicates. The first email is primary. Writes an audit event.", { idempotent: false }),
    inputSchema: createPersonInputSchema
  }, (input, context) => runMcpTool("create_person", () => people.createPerson(actorOf(context), input)));

  server.registerTool("update_person", {
    ...writeTool("Update a person", "Changes name, role, persona, organization, country, city, languages or LinkedIn URL. Omitted fields stay; null clears an optional field. Repeating the same change is a no-op. Emails have their own tool."),
    inputSchema: updatePersonInputSchema
  }, (input, context) => runMcpTool("update_person", () => people.updatePerson(actorOf(context), input)));

  server.registerTool("set_person_emails", {
    ...writeTool("Set a person's emails", "Replaces the person's whole email list (first is primary, at most 10). Refused if another person owns one of the addresses. Send an empty list to clear."),
    inputSchema: setPersonEmailsInputSchema
  }, (input, context) => runMcpTool("set_person_emails", () => people.setPersonEmails(actorOf(context), input)));

  server.registerTool("set_person_links", {
    ...writeTool("Set a person's links", "Replaces the person's whole list of extra links (website, GitHub, portfolio, other; at most 10, each with an optional short label). The same page written two ways counts once. The LinkedIn profile has its own field on update_person. Send an empty list to clear."),
    inputSchema: setPersonLinksInputSchema
  }, (input, context) => runMcpTool("set_person_links", () => people.setPersonLinks(actorOf(context), input)));

  server.registerTool("mark_person_do_not_contact", {
    ...writeTool("Mark a person do-not-contact", "Flags a person as do-not-contact with a reason. Use only on the owner's explicit instruction, never on your own inference from a message. Reversible with clear_person_do_not_contact."),
    inputSchema: markDoNotContactInputSchema
  }, (input, context) => runMcpTool("mark_person_do_not_contact", () => people.markPersonDoNotContact(actorOf(context), input)));

  server.registerTool("clear_person_do_not_contact", {
    ...writeTool("Clear do-not-contact", "Removes a person's do-not-contact flag. Use only on the owner's explicit instruction."),
    inputSchema: personIdInputSchema
  }, (input, context) => runMcpTool("clear_person_do_not_contact", () => people.clearPersonDoNotContact(actorOf(context), input)));

  server.registerTool("archive_person", {
    ...writeTool("Archive a person", "Hides a person from lists and searches. Their prospects, notes and history stay, and they can be restored. Use instead of deleting, which is not possible. Repeating it is a no-op."),
    inputSchema: personIdInputSchema
  }, (input, context) => runMcpTool("archive_person", () => people.archivePerson(actorOf(context), input)));

  server.registerTool("restore_person", {
    ...writeTool("Restore a person", "Brings an archived person back into lists and searches. Find archived people with search_people scope archived. Repeating it is a no-op."),
    inputSchema: personIdInputSchema
  }, (input, context) => runMcpTool("restore_person", () => people.restorePerson(actorOf(context), input)));
}
