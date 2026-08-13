import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { checkMutationLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { executeBulkAction, bulkActionSchema } from '@/server/tasks/bulk.service';
import type { ProjectCapability } from '@/server/auth/capabilities';
import { db } from '@/server/db/client';

/**
 * Map each bulk action type to the project capability it requires.
 *
 * Destructive actions (delete) require DELETE_TASK. Move requires both
 * EDIT_TASK on the source and CREATE_TASK on the target. Tag operations
 * require MANAGE_TAGS. Field updates use EDIT_TASK.
 */
const BULK_ACTION_CAPABILITY: Record<string, ProjectCapability> = {
  status: 'EDIT_TASK',
  priority: 'EDIT_TASK',
  assignee: 'EDIT_TASK',
  dueDate: 'EDIT_TASK',
  complete: 'EDIT_TASK',
  delete: 'DELETE_TASK',
  move: 'EDIT_TASK',
  addTag: 'MANAGE_TAGS',
  removeTag: 'MANAGE_TAGS',
};

/**
 * POST /api/projects/:projectId/tasks/bulk
 *
 * Execute a bulk action on multiple tasks at once. All operations run inside
 * a single database transaction (all-or-nothing).
 *
 * Authorization is enforced through the centralized capability matrix:
 * each action type maps to a specific project capability.
 *
 * Security hardening (FCP-4): before dispatching to the service, the route
 * verifies that EVERY task id in the request belongs to this project. If any
 * task id is foreign, the entire operation is rejected with a 400 — no partial
 * mutation ever reaches the database. The assignee (when set) must be a
 * ProjectMember, and the tag (for addTag / removeTag) must belong to this
 * project, so cross-project TaskTag rows can never be created or deleted.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    // Rate limit: 10 bulk actions per minute per IP.
    const rl = checkMutationLimit(request, RATE_LIMITS.bulkAction, 'bulk-action');
    if (rl) return rl;

    const user = await requireAuthenticatedUser();
    const { projectId } = await params;

    const body = await request.json().catch(() => null);
    const parsed = bulkActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid bulk action' },
        { status: 400 },
      );
    }

    const action = parsed.data;
    const capability = BULK_ACTION_CAPABILITY[action.action];
    if (!capability) {
      return NextResponse.json({ error: 'Unknown bulk action' }, { status: 400 });
    }
    await requireProjectCapability(user.id, projectId, capability);

    // For move, the caller must also be allowed to create tasks in the
    // target project (membership + CREATE_TASK capability).
    if (action.action === 'move') {
      await requireProjectCapability(user.id, action.targetProjectId, 'CREATE_TASK');
    }

    // ---- Task ownership: EVERY task id in the payload must belong to this
    // project. If any id is foreign (cross-project tampering, stale id,
    // deleted task), reject the entire operation — no partial mutation.
    // Deduplicate so a caller passing the same id twice doesn't trip the
    // length check.
    const uniqueTaskIds = Array.from(new Set(action.taskIds));
    const projectTasks = await db.task.findMany({
      where: { id: { in: uniqueTaskIds }, projectId },
      select: { id: true },
    });
    if (projectTasks.length !== uniqueTaskIds.length) {
      return NextResponse.json(
        { error: 'Some tasks do not belong to this project' },
        { status: 400 },
      );
    }

    // ---- Assignee membership: when an assignee is set (not cleared), the
    // target user must be a ProjectMember of this project. Unassigning
    // (assigneeId === null) is always allowed.
    if (action.action === 'assignee' && action.assigneeId) {
      const assigneeMembership = await db.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: action.assigneeId } },
      });
      if (!assigneeMembership) {
        return NextResponse.json(
          { error: 'Assignee is not a member of this project' },
          { status: 400 },
        );
      }
    }

    // ---- Tag ownership: the tag must belong to this project. Without this
    // check a caller could pass a tagId from another project and create or
    // delete cross-project TaskTag rows. (The service re-verifies this for
    // addTag as defense in depth; we do it here so the response shape and
    // status code are consistent across add/remove.)
    if (action.action === 'addTag' || action.action === 'removeTag') {
      const tag = await db.tag.findUnique({
        where: { id: action.tagId },
        select: { projectId: true },
      });
      if (!tag || tag.projectId !== projectId) {
        return NextResponse.json(
          { error: 'Tag does not belong to this project' },
          { status: 400 },
        );
      }
    }

    const result = await executeBulkAction(projectId, action);
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
