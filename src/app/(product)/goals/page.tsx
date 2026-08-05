'use client';

import React from 'react';
import { GoalsView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function GoalsRoutePage() {
  const state = useFlowDeck();

  return (
    <GoalsView
      goals={state.goals}
      keyResults={state.keyResults}
      onAddGoal={state.addGoal}
      onUpdateGoal={state.updateGoal}
      onDeleteGoal={state.deleteGoal}
      onAddKeyResult={state.addKeyResult}
      onUpdateKeyResult={state.updateKeyResult}
      onDeleteKeyResult={state.deleteKeyResult}
    />
  );
}
