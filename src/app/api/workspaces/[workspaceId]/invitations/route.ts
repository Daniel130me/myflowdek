import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceRole,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  createInvitation,
  listInvitations,
} from '@/server/invitations/service';
import { createInvitationSchema } from '@/server/invitations/schemas';
import { INVITATION_ISSUER_ROLES } from '@/server/invitations/constants';
import type { WorkspaceRole } from '@prisma/client';

/**
 * GET /api/workspaces/:workspaceId/invitations
 *
 * List all invitations for a workspace. OWNER/ADMIN only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    await requireWorkspaceRole(
      user.id,
      workspaceId,
      INVITATION_ISSUER_ROLES as unknown as WorkspaceRole[],
    );

    const invitations = await listInvitations(workspaceId);
    return NextResponse.json({ invitations });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/workspaces/:workspaceId/invitations
 *
 * Create a new pending invitation. OWNER/ADMIN only. The invitation email
 * is sent to the recipient with a token URL (email sending is a TODO; the
 * token is returned in the response for now).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    await requireWorkspaceRole(
      user.id,
      workspaceId,
      INVITATION_ISSUER_ROLES as unknown as WorkspaceRole[],
    );

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
