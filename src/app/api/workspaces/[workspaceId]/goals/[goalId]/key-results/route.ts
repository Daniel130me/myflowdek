import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireWorkspaceCapability, authErrorResponse } from '@/server/auth/authorization';
import { addKeyResult, createKeyResultSchema } from '@/server/goals/goal.service';
import { db } from '@/server/db/client';

/**
 * Verify the parent goal belongs to the workspace in the URL — prevents IDOR
 * where a manager of workspace A could add key results to goals in workspace B
 * by guessing the goalId.
 */
async function verifyGoalInWorkspace(goalId: string, workspaceId: string): Promise<boolean> {
  const goal = await db.goal.findUnique({
    where: { id: goalId },
    select: { workspaceId: true },
  });
  return !!goal && goal.workspaceId === workspaceId;
}

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, goalId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_GOALS');

    if (!(await verifyGoalInWorkspace(goalId, workspaceId))) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createKeyResultSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const kr = await addKeyResult(goalId, parsed.data);
    return NextResponse.json({ keyResult: kr }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
