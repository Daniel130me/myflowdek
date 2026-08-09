import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireWorkspaceCapability, authErrorResponse } from '@/server/auth/authorization';
import { getGoal, updateGoal, deleteGoal, updateGoalSchema } from '@/server/goals/goal.service';

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, goalId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'VIEW_WORKSPACE');
    const goal = await getGoal(goalId);
    return NextResponse.json({ goal });
  } catch (e) { return authErrorResponse(e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, goalId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_GOALS');
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
    await deleteGoal(goalId);
    return NextResponse.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
