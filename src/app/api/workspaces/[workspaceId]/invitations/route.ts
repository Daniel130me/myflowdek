import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  createInvitation,
  listInvitations,
} from '@/server/invitations/service';
import { createInvitationSchema } from '@/server/invitations/schemas';

/**
 * GET /api/workspaces/:workspaceId/invitations
 *
 * List pending invitations for a workspace. OWNER/ADMIN only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    await requireWorkspaceCapability(user.id, workspaceId, 'INVITE_MEMBERS');

    const invitations = await listInvitations(workspaceId);
    return NextResponse.json({ invitations });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/workspaces/:workspaceId/invitations
 *
 * Create a new pending invitation and deliver its token by email.
 * OWNER/ADMIN only; raw tokens are never returned by the API.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    await requireWorkspaceCapability(user.id, workspaceId, 'INVITE_MEMBERS');

    const body = await request.json().catch(() => null);
    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const invitation = await createInvitation(workspaceId, user.id, parsed.data);
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
