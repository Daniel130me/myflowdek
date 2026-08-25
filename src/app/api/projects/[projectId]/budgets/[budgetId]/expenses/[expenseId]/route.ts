import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { deleteExpense } from '@/server/budgets/budget.service';
import { db } from '@/server/db/client';

/**
 * Verify the expense belongs to the budget + project in the URL — prevents
 * IDOR where a manager of project A could delete expenses in project B by
 * guessing either the budgetId or the expenseId.
 */
async function verifyExpenseChain(
  expenseId: string,
  budgetId: string,
  projectId: string,
): Promise<boolean> {
  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    select: { budgetId: true, projectId: true },
  });
  if (!expense) return false;
  return expense.budgetId === budgetId && expense.projectId === projectId;
}

/**
 * DELETE /api/projects/:projectId/budgets/:budgetId/expenses/:expenseId
 *
 * Delete an expense and decrement the parent budget's spent total.
 * Requires MANAGE_BUDGETS capability.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; budgetId: string; expenseId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, budgetId, expenseId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_BUDGETS');

    if (!(await verifyExpenseChain(expenseId, budgetId, projectId))) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await deleteExpense(expenseId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
