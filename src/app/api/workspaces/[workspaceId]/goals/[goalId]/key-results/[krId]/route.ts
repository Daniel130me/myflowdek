import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireWorkspaceCapability, authErrorResponse } from '@/server/auth/authorization';
import { updateKeyResult, deleteKeyResult } from '@/server/goals/goal.service';

export async function PATCH(req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string; krId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, krId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_GOALS');
    const body = await req.json().catch(() => null);
    const kr = await updateKeyResult(krId, body ?? {});
    return NextResponse.json({ keyResult: kr });
  } catch (e) { return authErrorResponse(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string; krId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, krId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_GOALS');
    await deleteKeyResult(krId);
    return NextResponse.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
