import { z } from "zod";

export const auditEventInputSchema = z.object({
  actorType: z.enum(["user", "mcp", "import", "system"]),
  actorId: z.string().trim().min(1).max(200),
  requestId: z.string().trim().min(1).max(200),
  action: z.string().trim().min(1).max(120),
  entityType: z.string().trim().min(1).max(120),
  entityId: z.uuid(),
  source: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(500),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type AuditEventInput = z.infer<typeof auditEventInputSchema>;
