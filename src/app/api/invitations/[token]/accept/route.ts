import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import { acceptInvitation } from '@/server/invitations/service';

/**
 * POST /api/invitations/:token/accept
 *
 * Accept a workspace invitation. The authenticated user's email must match
 * the invitation email. Creates a WorkspaceMember row in a transaction with
 * the invitation status update (ACCEPTED). Idempotent: if the user is already
 * a member, the invitation is still marked accepted.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { token } = await params;

    const result = await acceptInvitation(token, user.id, user.email);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return authErrorResponse(error);
  }
}
