import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  requireProjectRole,
  authErrorResponse,
} from '@/server/auth/authorization';
import { checkMutationLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { executeBulkAction, bulkActionSchema } from '@/server/tasks/bulk.service';
import { PROJECT_MANAGER_ROLES } from '@/server/projects/constants';
import type { ProjectRole } from '@prisma/client';

/**
 * POST /api/projects/:projectId/tasks/bulk
 *
 * Execute a bulk action on multiple tasks at once. All operations run inside
 * a single database transaction (all-or-nothing).
 *
 * Actions that require manager role (OWNER/ADMIN):
 *   - delete, move
 *
 * Actions any member can perform:
 *   - status, priority, assignee, dueDate, complete, addTag, removeTag
 *
 * The route validates the action shape with a discriminated-union Zod schema
 * so each action type is type-safe.
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

    // Destructive actions require manager role.
    if (action.action === 'delete' || action.action === 'move') {
      await requireProjectRole(
        user.id,
        projectId,
        PROJECT_MANAGER_ROLES as unknown as ProjectRole[],
      );
    } else {
      // Non-destructive actions just require membership.
      await requireProjectMember(user.id, projectId);
    }

    // For move, the caller must also be a member of the target project.
    if (action.action === 'move') {
      await requireProjectMember(user.id, action.targetProjectId);
    }

    const result = await executeBulkAction(projectId, action);
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
