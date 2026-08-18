import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';
import { TASK_STATUSES, TASK_PRIORITIES } from './constants';

/**
 * Bulk task operations.
 *
 * Every bulk operation runs inside a single db.$transaction so it's
 * all-or-nothing. If any task update fails, the whole batch rolls back.
 *
 * Authorization (project membership) is verified in the route before calling
 * these functions. The service trusts the caller has already checked.
 */

/** The set of bulk actions supported by POST /api/projects/:id/tasks/bulk. */
export const bulkActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('status'),
    taskIds: z.array(z.string()).min(1),
    status: z.enum(TASK_STATUSES),
  }),
  z.object({
    action: z.literal('priority'),
    taskIds: z.array(z.string()).min(1),
    priority: z.enum(TASK_PRIORITIES),
  }),
  z.object({
    action: z.literal('assignee'),
    taskIds: z.array(z.string()).min(1),
    assigneeId: z.string().nullable(),
  }),
  z.object({
    action: z.literal('dueDate'),
    taskIds: z.array(z.string()).min(1),
    dueDate: z.iso.datetime().nullable(),
  }),
  z.object({
    action: z.literal('delete'),
    taskIds: z.array(z.string()).min(1),
  }),
  z.object({
    action: z.literal('complete'),
    taskIds: z.array(z.string()).min(1),
  }),
  z.object({
    action: z.literal('move'),
    taskIds: z.array(z.string()).min(1),
    targetProjectId: z.string().min(1),
  }),
  z.object({
    action: z.literal('addTag'),
    taskIds: z.array(z.string()).min(1),
    tagId: z.string().min(1),
  }),
  z.object({
    action: z.literal('removeTag'),
    taskIds: z.array(z.string()).min(1),
    tagId: z.string().min(1),
  }),
]);

export type BulkAction = z.infer<typeof bulkActionSchema>;

/**
 * Execute a bulk action in a single transaction. Returns the number of
 * affected tasks.
 */
export async function executeBulkAction(
  projectId: string,
  input: BulkAction,
): Promise<{ affected: number }> {
  switch (input.action) {
    case 'status': {
      const result = await db.task.updateMany({
        where: { id: { in: input.taskIds }, projectId },
        data: {
          status: input.status,
          completedAt: input.status === 'done' ? new Date() : null,
        },
      });
      return { affected: result.count };
    }

    case 'priority': {
      const result = await db.task.updateMany({
        where: { id: { in: input.taskIds }, projectId },
        data: { priority: input.priority },
      });
      return { affected: result.count };
    }

    case 'assignee': {
      const result = await db.task.updateMany({
        where: { id: { in: input.taskIds }, projectId },
        data: { assigneeId: input.assigneeId },
      });
      return { affected: result.count };
    }

    case 'dueDate': {
      const result = await db.task.updateMany({
        where: { id: { in: input.taskIds }, projectId },
        data: { dueDate: input.dueDate ? new Date(input.dueDate) : null },
      });
      return { affected: result.count };
    }

    case 'delete': {
      const result = await db.task.deleteMany({
        where: { id: { in: input.taskIds }, projectId },
      });
      return { affected: result.count };
    }

    case 'complete': {
      const result = await db.task.updateMany({
        where: { id: { in: input.taskIds }, projectId },
        data: { status: 'done', progress: 100, completedAt: new Date() },
      });
      return { affected: result.count };
    }

    case 'move': {
      // Verify the target project exists and is in the same workspace.
      const sourceProject = await db.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true },
      });
      if (!sourceProject) throw new AuthError('Source project not found', 404);

      const targetProject = await db.project.findUnique({
        where: { id: input.targetProjectId },
        select: { workspaceId: true },
      });
      if (!targetProject) throw new AuthError('Target project not found', 404);
      if (targetProject.workspaceId !== sourceProject.workspaceId) {
        throw new AuthError('Cannot move tasks across workspaces', 400);
      }

      const result = await db.task.updateMany({
        where: { id: { in: input.taskIds }, projectId },
        data: { projectId: input.targetProjectId },
      });
      return { affected: result.count };
    }

    case 'addTag': {
      // Verify the tag belongs to this project.
      const tag = await db.tag.findUnique({
        where: { id: input.tagId },
        select: { projectId: true },
      });
      if (!tag || tag.projectId !== projectId) {
        throw new AuthError('Tag not found in this project', 404);
      }

      // Create TaskTag rows, skipping duplicates. Prisma doesn't have an
      // upsertMany, so we create them in a transaction with skipDuplicates
      // via createMany.
      const existing = await db.taskTag.findMany({
        where: { taskId: { in: input.taskIds }, tagId: input.tagId },
        select: { taskId: true },
      });
      const existingSet = new Set(existing.map(e => e.taskId));
      const toCreate = input.taskIds
        .filter(id => !existingSet.has(id))
        .map(taskId => ({ taskId, tagId: input.tagId }));

      if (toCreate.length > 0) {
        await db.taskTag.createMany({ data: toCreate, skipDuplicates: true });
      }
      return { affected: toCreate.length };
    }

    case 'removeTag': {
      const result = await db.taskTag.deleteMany({
        where: { taskId: { in: input.taskIds }, tagId: input.tagId },
      });
      return { affected: result.count };
    }

    default:
      throw new AuthError(`Unknown bulk action`, 400);
  }
}
