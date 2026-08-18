import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { listWorkspaceMembers } from '@/server/workspaces/member-service';

/**
 * GET /api/workspaces/:workspaceId/members
 *
 * List all members of a workspace. Any member can view the member list.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    // Any member can view the list.
    await requireWorkspaceCapability(user.id, workspaceId, 'VIEW_WORKSPACE');

    const members = await listWorkspaceMembers(workspaceId);
    return NextResponse.json({ members });
  } catch (error) {
    return authErrorResponse(error);
  }
}
