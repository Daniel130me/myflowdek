import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { deleteBudget, createExpense, createExpenseSchema, listExpenses } from '@/server/budgets/budget.service';

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string; budgetId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, budgetId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const expenses = await listExpenses(budgetId);
    return NextResponse.json({ expenses });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string; budgetId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, budgetId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_BUDGETS');
    const body = await req.json().catch(() => null);
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    // Verify the budget belongs to this project.
    const expense = await createExpense(projectId, user.id, { ...parsed.data, budgetId });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ projectId: string; budgetId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, budgetId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_BUDGETS');
    await deleteBudget(budgetId);
    return NextResponse.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
