import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  requireProjectRole,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  listProjectMembers,
  addProjectMember,
} from '@/server/projects/project-members.service';
import { addProjectMemberSchema } from '@/server/projects/project-members.service';
import { PROJECT_MANAGER_ROLES } from '@/server/projects/constants';
import type { ProjectRole } from '@prisma/client';

/**
 * GET /api/projects/:projectId/members
 *
 * List all members of a project. Any project member can view.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;

    await requireProjectMember(user.id, projectId);
    const members = await listProjectMembers(projectId);
    return NextResponse.json({ members });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/projects/:projectId/members
 *
 * Add a member to the project. OWNER/ADMIN only. The target user must
 * already be a workspace member (the service enforces this via FK).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;

    await requireProjectRole(user.id, projectId, PROJECT_MANAGER_ROLES as unknown as ProjectRole[]);

    const body = await request.json().catch(() => null);
    const parsed = addProjectMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const member = await addProjectMember(projectId, parsed.data);
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
