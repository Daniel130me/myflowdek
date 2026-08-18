import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  getProject,
  updateProject,
  deleteProject,
  setProjectFavorite,
} from '@/server/projects/project.service';
import { updateProjectSchema } from '@/server/projects/schemas';

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

    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
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
 * can set their own per-user favourite flag (not a project-wide setting).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;

    const body = await request.json().catch(() => null);

    // Favourite preference — any member can set this for themselves.
    if (body && typeof body.favorite === 'boolean') {
      await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
      const result = await setProjectFavorite(projectId, user.id, body.favorite);
      return NextResponse.json(result);
    }

    // Regular update — requires manager role.
    await requireProjectCapability(user.id, projectId, 'MANAGE_PROJECT');

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

    await requireProjectCapability(user.id, projectId, 'MANAGE_PROJECT');
    await deleteProject(projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
