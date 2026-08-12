import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { listApprovals, createApproval, createApprovalSchema } from '@/server/approvals/approval.service';

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const approvals = await listApprovals(projectId);
    return NextResponse.json({ approvals });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_APPROVALS');
    const body = await req.json().catch(() => null);
    const parsed = createApprovalSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const approval = await createApproval(projectId, user.id, parsed.data);
    return NextResponse.json({ approval }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
