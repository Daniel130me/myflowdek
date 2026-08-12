import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireWorkspaceCapability, authErrorResponse } from '@/server/auth/authorization';
import { getGoal, updateGoal, deleteGoal, updateGoalSchema } from '@/server/goals/goal.service';
import { db } from '@/server/db/client';

/**
 * Verify the goal belongs to the workspace in the URL — prevents IDOR where
 * a manager of workspace A could mutate goals in workspace B by guessing
 * the goalId. Returns 404 if missing or mismatched.
 */
async function verifyGoalInWorkspace(goalId: string, workspaceId: string): Promise<boolean> {
  const goal = await db.goal.findUnique({
    where: { id: goalId },
    select: { workspaceId: true },
  });
  return !!goal && goal.workspaceId === workspaceId;
}

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, goalId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'VIEW_WORKSPACE');

    if (!(await verifyGoalInWorkspace(goalId, workspaceId))) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const goal = await getGoal(goalId);
    return NextResponse.json({ goal });
  } catch (e) { return authErrorResponse(e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, goalId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_GOALS');

    if (!(await verifyGoalInWorkspace(goalId, workspaceId))) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const goal = await updateGoal(goalId, parsed.data);
    return NextResponse.json({ goal });
  } catch (e) { return authErrorResponse(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, goalId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_GOALS');

    if (!(await verifyGoalInWorkspace(goalId, workspaceId))) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await deleteGoal(goalId);
    return NextResponse.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
