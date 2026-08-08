import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  addReaction,
  removeReaction,
  createReactionSchema,
} from '@/server/comments/comment.service';
import { db } from '@/server/db/client';

/** Fetch the projectId for a comment (used for membership checks). */
async function getCommentProjectId(commentId: string): Promise<string | null> {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { projectId: true },
  });
  return comment?.projectId ?? null;
}

/**
 * POST /api/comments/:commentId/reactions
 *
 * Add an emoji reaction to a comment. Idempotent — re-reacting with the same
 * emoji returns the existing reaction (no error).
 */
export async function POST(
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
    await requireProjectMember(user.id, projectId);

    const body = await request.json().catch(() => null);
    const parsed = createReactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const reaction = await addReaction(commentId, user.id, parsed.data);
    return NextResponse.json({ reaction }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/comments/:commentId/reactions?emoji=xxx
 *
 * Remove the authenticated user's reaction with the given emoji.
 */
export async function DELETE(
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
    await requireProjectMember(user.id, projectId);

    const url = new URL(request.url);
    const emoji = url.searchParams.get('emoji');
    if (!emoji) {
      return NextResponse.json(
        { error: 'emoji query parameter is required' },
        { status: 400 },
      );
    }

    await removeReaction(commentId, user.id, emoji);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
