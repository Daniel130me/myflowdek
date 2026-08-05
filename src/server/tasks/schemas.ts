import { z } from "zod";

export const taskStatuses = ["backlog", "inprogress", "review", "done"] as const;
export const taskPriorities = ["low", "medium", "high", "urgent"] as const;

const taskFields = {
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).optional().nullable(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  startDate: z.iso.datetime().optional().nullable(),
  dueDate: z.iso.datetime().optional().nullable(),
  duration: z.number().int().min(1).max(3_650).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isMilestone: z.boolean().optional(),
  assigneeId: z.string().trim().min(1).optional().nullable(),
  createdById: z.string().trim().min(1).optional().nullable(),
  parentId: z.string().trim().min(1).optional().nullable(),
};

export const taskListQuerySchema = z.object({
  status: z.enum(taskStatuses).optional(),
  assigneeId: z.string().trim().min(1).optional(),
});

export const createTaskSchema = z.object(taskFields);
export const updateTaskSchema = z.object(taskFields).partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one task field must be provided.",
);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

