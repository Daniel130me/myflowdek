import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { archiveProject } from '@/server/projects/project.service';

/**
 * POST /api/projects/:projectId/archive
 *
 * Archive a project (soft-delete). OWNER/ADMIN only. Data is preserved.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;

    await requireProjectCapability(user.id, projectId, 'MANAGE_PROJECT');
    const project = await archiveProject(projectId);
    return NextResponse.json({ project });
  } catch (error) {
    return authErrorResponse(error);
  }
}
