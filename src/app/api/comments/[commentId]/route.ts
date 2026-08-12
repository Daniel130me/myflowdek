import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  requireProjectRole,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  updateComment,
  deleteComment,
  updateCommentSchema,
} from '@/server/comments/comment.service';
import { PROJECT_MANAGER_ROLES } from '@/server/projects/constants';
import type { ProjectRole } from '@prisma/client';

/** Fetch the projectId for a comment (used for membership checks). */
async function getCommentProjectId(commentId: string): Promise<string | null> {
  const { db } = await import('@/server/db/client');
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { projectId: true },
  });
  return comment?.projectId ?? null;
}

/**
 * PATCH /api/comments/:commentId
 *
 * Edit a comment. Only the author can edit. Sets editedAt.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { commentId } = await params;

    const projectId = await getCommentProjectId(commentId);
    if (!projectId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    await requireProjectCapability(user.id, projectId, 'CREATE_COMMENT');

    const body = await request.json().catch(() => null);
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const comment = await updateComment(commentId, user.id, parsed.data);
    return NextResponse.json({ comment });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/comments/:commentId
 *
 * Delete a comment. The author or a project manager (OWNER/ADMIN) can
 * delete. Cascades to replies.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { commentId } = await params;

    const projectId = await getCommentProjectId(commentId);
    if (!projectId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if the user is a manager (to allow non-authors to delete).
    let isManager = false;
    try {
      await requireProjectRole(
        user.id,
        projectId,
        PROJECT_MANAGER_ROLES as unknown as ProjectRole[],
      );
      isManager = true;
    } catch {
      isManager = false;
    }

    // Either way, the user must be a project member with comment capability.
    await requireProjectCapability(user.id, projectId, 'CREATE_COMMENT');

    await deleteComment(commentId, user.id, isManager);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
