import { db } from '@/server/db/client';
import type { Prisma } from '@prisma/client';
import type { ActivityType } from './constants';

/**
 * Business/project activity service — records significant task events into
 * the ActivityEntry table.
 *
 * Distinct from the security AuditLog:
 *   - AuditLog    → security/system activity (login, register, auth failures)
 *   - ActivityEntry → business/project activity (task created, assigned, etc.)
 *
 * The activity feed powers the task-detail timeline:
 *   09:41  Oluwagbenga created this task
 *   10:03  Ada was assigned
 *   12:17  Status changed from Backlog → In Progress
 *
 * Every recorder call is a single INSERT. Never throws — if the activity
 * write fails, the main operation should still succeed (the activity is a
 * side-effect, not a critical path).
 */

/** Shape of the meta JSON stored with each activity entry. */
export interface ActivityMeta {
  before?: string | null;
  after?: string | null;
  [key: string]: unknown;
}

/**
 * Record a single activity entry. Swallows errors so it never breaks the
 * caller's transaction/operation.
 */
export async function recordActivity(
  taskId: string,
  projectId: string,
  authorId: string | null,
  type: ActivityType,
  description: string,
  meta?: ActivityMeta,
): Promise<void> {
  try {
    await db.activityEntry.create({
      data: {
        taskId,
        projectId,
        authorId,
        type,
        description,
        meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // Log but don't throw — activity recording must not break the operation.
    console.error('[activity] failed to record entry:', type, err);
  }
}

/** List activity entries for a task, newest first. */
export function listActivityForTask(taskId: string, limit = 50) {
  return db.activityEntry.findMany({
    where: { taskId },
    include: {
      author: {
        select: { id: true, name: true, avatarColor: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** List activity for a project (for a project-wide feed). */
export function listActivityForProject(projectId: string, limit = 50) {
  return db.activityEntry.findMany({
    where: { projectId },
    include: {
      author: {
        select: { id: true, name: true, avatarColor: true },
      },
      task: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
