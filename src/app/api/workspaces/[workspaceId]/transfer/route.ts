import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { transferOwnership } from '@/server/workspaces/member-service';
import { transferOwnershipSchema } from '@/server/workspaces/schemas';

/**
 * POST /api/workspaces/:workspaceId/transfer
 *
 * Transfer workspace ownership to another existing member. OWNER only.
 *
 * Transaction: demotes the current owner to ADMIN, promotes the target to
 * OWNER. Guards: target must be a member, cannot already be owner, cannot
 * be yourself.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    // Only the OWNER can transfer ownership.
    await requireWorkspaceCapability(user.id, workspaceId, 'TRANSFER_OWNERSHIP');

    const body = await request.json().catch(() => null);
    const parsed = transferOwnershipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const member = await transferOwnership(workspaceId, user.id, parsed.data.newOwnerId);
    return NextResponse.json({ member });
  } catch (error) {
    return authErrorResponse(error);
  }
}
