import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  authErrorResponse,
} from '@/server/auth/authorization';
import { listComments, createComment } from '@/server/comments/comment.service';
import { createCommentSchema } from '@/server/comments/comment.service';

/** GET /api/projects/:projectId/comments?taskId=xxx — list comments. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);

    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId') ?? undefined;

    const comments = await listComments(projectId, taskId);
    return NextResponse.json({ comments });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/projects/:projectId/comments — create a comment. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);

    const body = await request.json().catch(() => null);
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const comment = await createComment(projectId, user.id, parsed.data);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
