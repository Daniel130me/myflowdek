import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { deleteBudget, createExpense, createExpenseSchema, listExpenses } from '@/server/budgets/budget.service';
import { db } from '@/server/db/client';

/**
 * Verify the budget belongs to the project in the URL — prevents IDOR where
 * a manager of project A could mutate budgets/expenses in project B by
 * guessing the budgetId. Returns the budget's projectId (for safe derivation
 * when creating expenses) or null if missing/mismatched.
 */
async function verifyBudgetInProject(
  budgetId: string,
  projectId: string,
): Promise<boolean> {
  const budget = await db.budget.findUnique({
    where: { id: budgetId },
    select: { projectId: true },
  });
  return !!budget && budget.projectId === projectId;
}

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string; budgetId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, budgetId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');

    if (!(await verifyBudgetInProject(budgetId, projectId))) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    const expenses = await listExpenses(budgetId);
    return NextResponse.json({ expenses });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string; budgetId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, budgetId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_BUDGETS');

    if (!(await verifyBudgetInProject(budgetId, projectId))) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });

    // Derive projectId from the URL/budget (already verified above), not from
    // the request body — prevents cross-project expense injection.
    const expense = await createExpense(projectId, user.id, { ...parsed.data, budgetId });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ projectId: string; budgetId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, budgetId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_BUDGETS');

    if (!(await verifyBudgetInProject(budgetId, projectId))) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    await deleteBudget(budgetId);
    return NextResponse.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
