import type { McpServer } from "@modelcontextprotocol/server";
import type { NotesServices } from "@/modules/notes/application/create-notes-services";
import { addNoteInputSchema } from "@/modules/notes/domain/note.schema";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { actorOf, writeTool } from "@/shared/mcp/tool-metadata";

export function registerNoteTools(server: McpServer, notes: NotesServices): void {
  server.registerTool("add_note", {
    ...writeTool("Add a note", "Adds a free-text note to one or more people, organizations or prospects (up to 5 records). Idempotent: the same text on the same first record returns the existing note (created: false). The note text is not copied into the audit trail. Notes are read back through get_person, get_organization and get_prospect."),
    inputSchema: addNoteInputSchema
  }, (input, context) => runMcpTool("add_note", () => notes.addNote(actorOf(context), input)));
}
