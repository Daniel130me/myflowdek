import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { restoreProject } from '@/server/projects/project.service';

/**
 * POST /api/projects/:projectId/restore
 *
 * Restore an archived project. OWNER/ADMIN only.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;

    await requireProjectCapability(user.id, projectId, 'MANAGE_PROJECT');
    const project = await restoreProject(projectId);
    return NextResponse.json({ project });
  } catch (error) {
    return authErrorResponse(error);
  }
}
