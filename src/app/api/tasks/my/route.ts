import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { TASK_STATUSES } from '@/server/tasks/constants';

/**
 * GET /api/tasks/my
 *
 * Returns all tasks assigned to the authenticated user across every project
 * they can access (i.e. projects they're a member of). Each task carries its
 * project's id/name/color so the My Tasks view can group + label rows
 * without a follow-up fetch.
 *
 * Query params:
 *   - ?status=backlog|in_progress|review|done   (optional filter)
 *   - ?limit=N                                   (optional, capped at 200)
 *
 * Authorization: VIEW_PROJECT capability on each project is implied by
 * ProjectMember existence — the join below only returns projects the user
 * belongs to.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const url = new URL(request.url);

    const statusParam = url.searchParams.get('status');
    const status =
      statusParam && (TASK_STATUSES as readonly string[]).includes(statusParam)
        ? statusParam
        : undefined;

    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 200) : 100;

    // Single query: join tasks → projects where the user is a member of the
    // task's project. The ProjectMember join enforces access — tasks in
    // projects the user can't see are never returned.
    const tasks = await db.task.findMany({
      where: {
        assigneeId: user.id,
        ...(status ? { status } : {}),
        project: {
          members: { some: { userId: user.id } },
          isArchived: false,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        startDate: true,
        dueDate: true,
        duration: true,
        progress: true,
        isMilestone: true,
        completedAt: true,
        parentId: true,
        sectionId: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: [{ completedAt: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return authErrorResponse(error);
  }
}
