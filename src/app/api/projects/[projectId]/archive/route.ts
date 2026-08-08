import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectRole,
  authErrorResponse,
} from '@/server/auth/authorization';
import { archiveProject } from '@/server/projects/project.service';
import { PROJECT_MANAGER_ROLES } from '@/server/projects/constants';
import type { ProjectRole } from '@prisma/client';

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

    await requireProjectRole(user.id, projectId, PROJECT_MANAGER_ROLES as unknown as ProjectRole[]);
    const project = await archiveProject(projectId);
    return NextResponse.json({ project });
  } catch (error) {
    return authErrorResponse(error);
  }
}
