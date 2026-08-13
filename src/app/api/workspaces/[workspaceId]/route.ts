import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from '@/server/workspaces/service';
import { updateWorkspaceSchema } from '@/server/workspaces/schemas';

/**
 * GET /api/workspaces/:workspaceId
 *
 * Get a workspace's details. Any member can view their workspace.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    // Membership check — any role can view.
    await requireWorkspaceCapability(user.id, workspaceId, 'VIEW_WORKSPACE');

    const workspace = await getWorkspace(workspaceId);
    return NextResponse.json({ workspace });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PATCH /api/workspaces/:workspaceId
 *
 * Update a workspace (rename). Only OWNER and ADMIN can update.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    // Only managers (OWNER, ADMIN) can update workspace settings.
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_WORKSPACE');

    const body = await request.json().catch(() => null);
    const parsed = updateWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const workspace = await updateWorkspace(workspaceId, parsed.data);
    return NextResponse.json({ workspace });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/workspaces/:workspaceId
 *
 * Delete a workspace. OWNER only, with a safeguard: the workspace must have
 * no other members (the owner must remove them or transfer ownership first).
 * Cascading deletes remove projects, tasks, etc.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    // Only the OWNER can delete.
    await requireWorkspaceCapability(user.id, workspaceId, 'DELETE_WORKSPACE');

    await deleteWorkspace(user.id, workspaceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
