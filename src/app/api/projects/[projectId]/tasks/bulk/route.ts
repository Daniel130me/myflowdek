import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { checkMutationLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { executeBulkAction, bulkActionSchema } from '@/server/tasks/bulk.service';
import type { ProjectCapability } from '@/server/auth/capabilities';

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

    const result = await executeBulkAction(projectId, action);
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
