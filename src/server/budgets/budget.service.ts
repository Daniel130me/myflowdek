import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createBudgetSchema = z.object({
  name: z.string().trim().min(1).max(200),
  totalBudget: z.number().min(0).default(0),
  currency: z.string().trim().max(3).default('USD'),
  startDate: z.iso.datetime().optional().nullable(),
  endDate: z.iso.datetime().optional().nullable(),
});

export const createExpenseSchema = z.object({
  budgetId: z.string().min(1),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive(),
  category: z.string().trim().max(50).default('general'),
  date: z.iso.datetime().optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export function listBudgets(projectId: string) {
  return db.budget.findMany({
    where: { projectId },
    include: { _count: { select: { expenses: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createBudget(projectId: string, input: CreateBudgetInput) {
  return db.budget.create({
    data: {
      projectId,
      name: input.name,
      totalBudget: input.totalBudget,
      currency: input.currency,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
}

export async function deleteBudget(budgetId: string) {
  await db.budget.delete({ where: { id: budgetId } })
    .catch(() => { throw new AuthError('Budget not found', 404); });
}

export function listExpenses(budgetId: string) {
  return db.expense.findMany({
    where: { budgetId },
    orderBy: { date: 'desc' },
  });
}

export async function createExpense(projectId: string, createdBy: string, input: CreateExpenseInput) {
  // Update the budget's spent total in the same transaction.
  return db.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        budgetId: input.budgetId,
        projectId,
        description: input.description,
        amount: input.amount,
        category: input.category,
        date: input.date ? new Date(input.date) : new Date(),
        createdBy,
      },
    });
    await tx.budget.update({
      where: { id: input.budgetId },
      data: { spent: { increment: input.amount } },
    });
    return expense;
  });
}

export async function deleteExpense(expenseId: string) {
  // Decrement the budget's spent total.
  const expense = await db.expense.findUnique({ where: { id: expenseId }, select: { amount: true, budgetId: true } });
  if (!expense) throw new AuthError('Expense not found', 404);
  await db.$transaction([
    db.expense.delete({ where: { id: expenseId } }),
    db.budget.update({ where: { id: expense.budgetId }, data: { spent: { decrement: expense.amount } } }),
  ]);
}
