'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BudgetView } from '@/features/flowdeck/components/views';
import { useBudgets } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { toast } from 'sonner';
import type { Budget, Expense } from '@/features/flowdeck/model';
import { apiUpdateBudget, apiListExpenses, apiDeleteExpense } from '@/lib/api-client';

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

  // Load expenses for every budget in the current project. Each budget's
  // expenses live under /api/projects/:pid/budgets/:budgetId — fetch them
  // in parallel and flatten into a single list for the view.
  useEffect(() => {
    if (!projectId || budgets.length === 0) {
      setExpenses([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const projectBudgets = budgets.filter(b => b.projectId === projectId);
      const results = await Promise.all(
        projectBudgets.map(b => apiListExpenses(projectId, b.id)),
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
    return () => { cancelled = true; };
  }, [projectId, budgets]);

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

  const handleUpdateBudget = useCallback(async (id: string, patch: Partial<Budget>) => {
    if (!projectId) return;
    // Optimistic local update + rollback on failure.
    const snapshot = budgets;
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    const res = await apiUpdateBudget(projectId, id, patch as Record<string, unknown>);
    if (res.ok) return;
    setBudgets(snapshot);
    toast.error('Failed to update budget', { description: res.error });
  }, [projectId, budgets]);

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

  const handleDeleteExpense = useCallback(async (id: string) => {
    if (!projectId) return;
    // Find the parent budget so we can hit the nested DELETE endpoint.
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    // Optimistic local delete + rollback on failure. The server's
    // deleteExpense also decrements the parent budget's spent total; on
    // failure we restore both the expense and the budget snapshot.
    const snapshotExpenses = expenses;
    const snapshotBudgets = budgets;
    setExpenses(prev => prev.filter(e => e.id !== id));
    setBudgets(prev => prev.map(b => b.id === exp.budgetId ? { ...b, spent: Math.max(0, b.spent - exp.amount) } : b));
    const res = await apiDeleteExpense(projectId, exp.budgetId, id);
    if (res.ok) {
      toast.success('Expense deleted');
      return;
    }
    setExpenses(snapshotExpenses);
    setBudgets(snapshotBudgets);
    toast.error('Failed to delete expense', { description: res.error });
  }, [projectId, expenses, budgets]);

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading budgets…</div>;

  return (
    <BudgetView
      budgets={budgets}
      expenses={expenses}
      projects={state.projects}
      currentProjectId={projectId ?? ''}
      onAddBudget={handleAddBudget}
      onUpdateBudget={handleUpdateBudget}
      onDeleteBudget={handleDeleteBudget}
      onAddExpense={handleAddExpense as any}
      onDeleteExpense={handleDeleteExpense}
    />
  );
}
