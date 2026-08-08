import { z } from "zod";

const optionalDate = z.iso.datetime().optional().nullable();

export const projectListQuerySchema = z.object({
  ownerId: z.string().trim().min(1),
  includeArchived: z.enum(["true", "false"]).default("false"),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2_000).optional().nullable(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  ownerId: z.string().trim().min(1),
  workspaceId: z.string().trim().min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

