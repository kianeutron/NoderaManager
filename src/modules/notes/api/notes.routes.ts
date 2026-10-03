import { Hono } from "hono";
import { getNotesServices } from "@/modules/notes/application/notes-services";
import { addNoteInputSchema } from "@/modules/notes/domain/note.schema";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { zodValidator } from "@/shared/api/zod-validator";
import { webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

export const notesRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  .post("/", zodValidator("json", addNoteInputSchema), async (context) => {
    return context.json(await getNotesServices().addNote(context.var.actor, context.req.valid("json")), 201, { "Cache-Control": "no-store" });
  });

export type NotesRoutes = typeof notesRoutes;
