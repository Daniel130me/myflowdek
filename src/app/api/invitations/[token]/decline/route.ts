import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import { declineInvitation } from '@/server/invitations/service';

/**
 * POST /api/invitations/:token/decline
 *
 * Decline a workspace invitation. The authenticated user's email must match
 * the invitation email. Marks the invitation as DECLINED (no membership
 * is created).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { token } = await params;

    await declineInvitation(token, user.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
