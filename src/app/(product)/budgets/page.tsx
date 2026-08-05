'use client';

import React from 'react';
import { BudgetView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function BudgetsRoutePage() {
  const state = useFlowDeck();

  return (
    <BudgetView
      budgets={state.budgets}
      expenses={state.expenses}
      projects={state.projects}
      currentProjectId={state.currentProjectId}
      onAddBudget={state.addBudget}
      onUpdateBudget={state.updateBudget}
      onDeleteBudget={state.deleteBudget}
      onAddExpense={state.addExpense}
      onDeleteExpense={state.deleteExpense}
    />
  );
}
