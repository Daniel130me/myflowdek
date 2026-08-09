import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireWorkspaceCapability, authErrorResponse } from '@/server/auth/authorization';
import { addKeyResult, createKeyResultSchema } from '@/server/goals/goal.service';

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string; goalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, goalId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_GOALS');
    const body = await req.json().catch(() => null);
    const parsed = createKeyResultSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const kr = await addKeyResult(goalId, parsed.data);
    return NextResponse.json({ keyResult: kr }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
