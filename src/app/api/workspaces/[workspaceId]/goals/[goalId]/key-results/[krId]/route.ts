import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireWorkspaceCapability, authErrorResponse } from '@/server/auth/authorization';
import { updateKeyResult, deleteKeyResult } from '@/server/goals/goal.service';
import { db } from '@/server/db/client';

/**
 * Verify nested-resource ownership end-to-end: the key result belongs to the
 * goal in the URL, AND the goal belongs to the workspace in the URL. Prevents
 * IDOR where a manager of workspace A could mutate key results in workspace B
 * by guessing either the goalId or the krId.
 */
async function verifyKeyResultChain(
  krId: string,
  goalId: string,
  workspaceId: string,
): Promise<boolean> {
  const kr = await db.keyResult.findUnique({
    where: { id: krId },
    select: { goalId: true, goal: { select: { workspaceId: true } } },
  });
  if (!kr || kr.goalId !== goalId) return false;
  return kr.goal.workspaceId === workspaceId;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string; krId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, goalId, krId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_GOALS');

    if (!(await verifyKeyResultChain(krId, goalId, workspaceId))) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const kr = await updateKeyResult(krId, body ?? {});
    return NextResponse.json({ keyResult: kr });
  } catch (e) { return authErrorResponse(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string; krId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, goalId, krId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_GOALS');

    if (!(await verifyKeyResultChain(krId, goalId, workspaceId))) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
    }

    await deleteKeyResult(krId);
    return NextResponse.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
