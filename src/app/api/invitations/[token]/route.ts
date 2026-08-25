import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/server/auth/authorization';
import { getInvitationByToken } from '@/server/invitations/service';

/**
 * GET /api/invitations/:token
 *
 * Public endpoint — no auth required (the recipient may not be logged in yet).
 * Returns the invitation details (workspace name, role, status) so the
 * recipient can decide whether to accept. Marks expired invitations as EXPIRED.
 *
 * The token acts as a capability: anyone with the token can view the
 * invitation, but only the matching email can accept/decline.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const invitation = await getInvitationByToken(token);
    return NextResponse.json({ invitation });
  } catch (error) {
    return authErrorResponse(error);
  }
}
