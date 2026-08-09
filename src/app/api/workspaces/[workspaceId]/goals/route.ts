import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireWorkspaceMember, authErrorResponse } from '@/server/auth/authorization';
import { listGoals, createGoal, createGoalSchema } from '@/server/goals/goal.service';

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;
    await requireWorkspaceMember(user.id, workspaceId);
    const goals = await listGoals(workspaceId);
    return NextResponse.json({ goals });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;
    await requireWorkspaceMember(user.id, workspaceId);
    const body = await req.json().catch(() => null);
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const goal = await createGoal(workspaceId, parsed.data);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
