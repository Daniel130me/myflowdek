import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  requireProjectRole,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  getProject,
  updateProject,
  deleteProject,
  toggleProjectFavorite,
} from '@/server/projects/project.service';
import { updateProjectSchema } from '@/server/projects/schemas';
import { PROJECT_MANAGER_ROLES } from '@/server/projects/constants';
import type { ProjectRole } from '@prisma/client';

/**
 * GET /api/projects/:projectId
 *
 * Get a project's details. Any project member can view.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;

    await requireProjectMember(user.id, projectId);
    const project = await getProject(projectId);
    return NextResponse.json({ project });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PATCH /api/projects/:projectId
 *
 * Update a project (name, description, color, dates). Only OWNER/ADMIN.
 *
 * Special case: if the body contains `{ favorite: true/false }`, any member
 * can toggle their own per-user favourite flag (not a project-wide setting).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;

    const body = await request.json().catch(() => null);

    // Favourite toggle — any member can do this for themselves.
    if (body && typeof body.favorite === 'boolean') {
      await requireProjectMember(user.id, projectId);
      const result = await toggleProjectFavorite(projectId, user.id);
      return NextResponse.json(result);
    }

    // Regular update — requires manager role.
    await requireProjectRole(user.id, projectId, PROJECT_MANAGER_ROLES as unknown as ProjectRole[]);

    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const project = await updateProject(projectId, parsed.data);
    return NextResponse.json({ project });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/:projectId
 *
 * Permanently delete a project. OWNER/ADMIN only. Cascading deletes remove
 * tasks, tags, comments, etc. Prefer archive for soft removal.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;

    await requireProjectRole(user.id, projectId, PROJECT_MANAGER_ROLES as unknown as ProjectRole[]);
    await deleteProject(projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
