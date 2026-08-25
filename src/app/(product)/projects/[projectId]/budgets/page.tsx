'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { BudgetView } from '@/features/flowdeck/components/views';
import { useBudgets } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getSingleParam } from '@/shared/utils/routeParams';
import { toast } from 'sonner';
import type { Budget, Expense } from '@/features/flowdeck/model';
import { apiUpdateBudget, apiListExpenses, apiDeleteExpense } from '@/lib/api-client';

export default function ProjectBudgetsPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  useEffect(() => {
    if (projectId && state.currentProjectId !== projectId) {
      state.syncProjectFromRoute(projectId);
    }
  }, [projectId, state]);

  const { data, loading, refetch } = useBudgets(projectId);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (data.budgets) {
      setBudgets(
        data.budgets.map((b: any) => ({
          id: b.id,
          projectId: b.projectId,
          name: b.name,
          totalBudget: b.totalBudget,
          spent: b.spent,
          currency: b.currency,
          startDate: b.startDate ?? '',
          endDate: b.endDate ?? '',
          createdAt: b.createdAt,
        })),
      );
    }
  }, [data]);

  useEffect(() => {
    if (!projectId || budgets.length === 0) {
      setExpenses([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const projectBudgets = budgets.filter((b) => b.projectId === projectId);
      const results = await Promise.all(
        projectBudgets.map((b) => apiListExpenses(projectId, b.id)),
      );
      if (cancelled) return;
      const all: Expense[] = [];
      for (const r of results) {
        if (!r.ok) continue;
        for (const raw of r.expenses as Array<Record<string, unknown>>) {
          all.push({
            id: raw.id as string,
            budgetId: raw.budgetId as string,
            projectId: (raw.projectId as string) ?? projectId,
            description: raw.description as string,
            amount: Number(raw.amount ?? 0),
            category: (raw.category as string) ?? 'general',
            date: (raw.date as string) ?? '',
            createdBy: (raw.createdBy as string) ?? '',
            createdAt: (raw.createdAt as string) ?? '',
          });
        }
      }
      setExpenses(all);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, budgets]);

  const handleAddBudget = useCallback(
    async (budget: Budget) => {
      if (!projectId) return;
      try {
        const res = await fetch(`/api/projects/${projectId}/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: budget.name,
            totalBudget: budget.totalBudget,
            currency: budget.currency,
            startDate: budget.startDate,
            endDate: budget.endDate,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success('Budget created');
        refetch();
      } catch {
        toast.error('Failed to create budget');
      }
    },
    [projectId, refetch],
  );

  const handleUpdateBudget = useCallback(
    async (id: string, patch: Partial<Budget>) => {
      if (!projectId) return;
      const res = await apiUpdateBudget(projectId, id, patch as Record<string, unknown>);
      if (res.ok) {
        refetch();
      } else {
        toast.error(res.error ?? 'Failed to update budget');
      }
    },
    [projectId, refetch],
  );

  const handleDeleteBudget = useCallback(
    async (id: string) => {
      if (!projectId) return;
      try {
        await fetch(`/api/projects/${projectId}/budgets/${id}`, { method: 'DELETE' });
        toast.success('Budget deleted');
        refetch();
      } catch {
        toast.error('Failed to delete budget');
      }
    },
    [projectId, refetch],
  );

  const handleAddExpense = useCallback(
    async (expense: Expense) => {
      if (!projectId || !expense.budgetId) return;
      try {
        const res = await fetch(
          `/api/projects/${projectId}/budgets/${expense.budgetId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              budgetId: expense.budgetId,
              description: expense.description,
              amount: expense.amount,
              category: expense.category,
              date: expense.date,
            }),
          },
        );
        if (!res.ok) throw new Error();
        toast.success('Expense logged');
        refetch();
      } catch {
        toast.error('Failed to log expense');
      }
    },
    [projectId, refetch],
  );

  const handleDeleteExpense = useCallback(
    async (id: string) => {
      if (!projectId) return;
      const exp = expenses.find((e) => e.id === id);
      if (!exp) return;
      const res = await apiDeleteExpense(projectId, exp.budgetId, id);
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        toast.success('Expense deleted');
        refetch();
      } else {
        toast.error(res.error ?? 'Failed to delete expense');
      }
    },
    [projectId, expenses, refetch],
  );

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading budgets…</div>;

  return (
    <BudgetView
      budgets={budgets}
      expenses={expenses}
      projects={state.projects}
      currentProjectId={projectId}
      onAddBudget={handleAddBudget}
      onUpdateBudget={handleUpdateBudget}
      onDeleteBudget={handleDeleteBudget}
      onAddExpense={handleAddExpense}
      onDeleteExpense={handleDeleteExpense}
    />
  );
}
