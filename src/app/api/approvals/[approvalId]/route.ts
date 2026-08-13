import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, authErrorResponse } from '@/server/auth/authorization';
import { resolveApproval, resolveApprovalSchema } from '@/server/approvals/approval.service';

/** PATCH /api/approvals/:approvalId — approve or reject. Only the assigned approver. */
export async function PATCH(req: Request, { params }: { params: Promise<{ approvalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { approvalId } = await params;
    const body = await req.json().catch(() => null);
    const parsed = resolveApprovalSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const approval = await resolveApproval(approvalId, user.id, parsed.data);
    return NextResponse.json({ approval });
  } catch (e) { return authErrorResponse(e); }
}
