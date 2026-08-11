'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BudgetView } from '@/features/flowdeck/components/views';
import { useBudgets } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { toast } from 'sonner';
import type { Budget, Expense } from '@/features/flowdeck/model';

export default function BudgetsRoutePage() {
  const state = useFlowDeck();
  const projectId = state.currentProjectId;
  const { data, loading, refetch } = useBudgets(projectId);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (data.budgets) {
      setBudgets(data.budgets.map((b: any) => ({
        id: b.id, projectId: b.projectId, name: b.name,
        totalBudget: b.totalBudget, spent: b.spent, currency: b.currency,
        startDate: b.startDate ?? '', endDate: b.endDate ?? '', createdAt: b.createdAt,
      })));
    }
  }, [data]);

  const handleAddBudget = useCallback(async (budget: Partial<Budget>) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/budgets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: budget.name, totalBudget: budget.totalBudget ?? 0, currency: budget.currency ?? 'USD' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Budget created');
      refetch();
    } catch { toast.error('Failed to create budget'); }
  }, [projectId, refetch]);

  const handleDeleteBudget = useCallback(async (id: string) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/budgets/${id}`, { method: 'DELETE' });
      toast.success('Budget deleted');
      refetch();
    } catch { toast.error('Failed to delete budget'); }
  }, [projectId, refetch]);

  const handleAddExpense = useCallback(async (budgetId: string, expense: Partial<Expense>) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/budgets/${budgetId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetId, description: expense.description, amount: expense.amount, category: expense.category ?? 'general' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Expense added');
      refetch();
    } catch { toast.error('Failed to add expense'); }
  }, [projectId, refetch]);

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading budgets…</div>;

  return (
    <BudgetView
      budgets={budgets}
      expenses={expenses}
      projects={state.projects}
      currentProjectId={projectId ?? ''}
      onAddBudget={handleAddBudget}
      onUpdateBudget={() => {}}
      onDeleteBudget={handleDeleteBudget}
      onAddExpense={handleAddExpense as any}
      onDeleteExpense={() => {}}
    />
  );
}
