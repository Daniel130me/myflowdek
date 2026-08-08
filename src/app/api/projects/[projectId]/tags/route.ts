import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  authErrorResponse,
} from '@/server/auth/authorization';
import { listTags, createTag } from '@/server/tags/tag.service';
import { upsertTagSchema } from '@/server/tags/tag.service';

/** GET /api/projects/:projectId/tags — list tags. Any project member. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);
    const tags = await listTags(projectId);
    return NextResponse.json({ tags });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/projects/:projectId/tags — create a tag. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);

    const body = await request.json().catch(() => null);
    const parsed = upsertTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const tag = await createTag(projectId, parsed.data);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
