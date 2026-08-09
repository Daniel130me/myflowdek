import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectMember, authErrorResponse } from '@/server/auth/authorization';
import { listBudgets, createBudget, createBudgetSchema } from '@/server/budgets/budget.service';

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);
    const budgets = await listBudgets(projectId);
    return NextResponse.json({ budgets });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);
    const body = await req.json().catch(() => null);
    const parsed = createBudgetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const budget = await createBudget(projectId, parsed.data);
    return NextResponse.json({ budget }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
