import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { deleteTag } from '@/server/tags/tag.service';

/**
 * DELETE /api/projects/:projectId/tags/:tagId
 *
 * Deletes a project tag. Requires MANAGE_TAGS capability.
 * The service deletes the tag by id; the tag's TaskTag rows cascade.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; tagId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, tagId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_TAGS');
    await deleteTag(tagId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
