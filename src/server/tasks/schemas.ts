import { z } from 'zod';
import { TASK_NAME_MAX_LENGTH, TASK_NAME_MIN_LENGTH, TASK_DESCRIPTION_MAX_LENGTH, TASK_STATUSES, TASK_PRIORITIES } from './constants';

const optionalDate = z.iso.datetime().optional().nullable();

export const createTaskSchema = z.object({
  name: z.string().trim().min(TASK_NAME_MIN_LENGTH, 'Task name is required').max(TASK_NAME_MAX_LENGTH),
  description: z.string().trim().max(TASK_DESCRIPTION_MAX_LENGTH).optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  startDate: optionalDate,
  dueDate: optionalDate,
  duration: z.number().int().nonnegative().optional(),
  parentId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  name: z.string().trim().min(TASK_NAME_MIN_LENGTH).max(TASK_NAME_MAX_LENGTH).optional(),
  description: z.string().trim().max(TASK_DESCRIPTION_MAX_LENGTH).optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  startDate: optionalDate,
  dueDate: optionalDate,
  duration: z.number().int().nonnegative().optional(),
  progress: z.number().min(0).max(100).optional(),
  assigneeId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  /** Recurrence pattern: 'daily' | 'weekly' | 'monthly' | null. When set,
   *  a background job creates the next occurrence after completion. Pass
   *  null to clear the recurrence. */
  recurrence: z.enum(['daily', 'weekly', 'monthly']).nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
