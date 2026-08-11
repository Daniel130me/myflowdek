'use client';

import React, { useState, useCallback } from 'react';
import { GoalsView } from '@/features/flowdeck/components/views';
import { useWorkspaces } from '@/features/flowdeck/hooks/useWorkspaces';
import { useGoals } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { toast } from 'sonner';
import type { Goal, KeyResult } from '@/features/flowdeck/model';

/**
 * Goals page — backed by the real API.
 * Fetches goals from GET /api/workspaces/:id/goals and mutates via API.
 */
export default function GoalsRoutePage() {
  const ws = useWorkspaces();
  const { data, loading, refetch } = useGoals(ws.selectedWorkspaceId);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);

  // Sync API data into local state for the view.
  React.useEffect(() => {
    if (data.goals) {
      setGoals(data.goals.map((g: any) => ({
        id: g.id, title: g.title, description: g.description ?? '',
        status: (g.status || 'not_started').toLowerCase() as any,
        startDate: g.startDate ?? '', endDate: g.endDate ?? '',
        parentId: g.parentId ?? null,
      })));
    }
  }, [data]);

  const handleAddGoal = useCallback(async (goal: Partial<Goal>) => {
    if (!ws.selectedWorkspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${ws.selectedWorkspaceId}/goals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: goal.title, description: goal.description }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Goal created');
      refetch();
    } catch { toast.error('Failed to create goal'); }
  }, [ws.selectedWorkspaceId, refetch]);

  const handleUpdateGoal = useCallback(async (id: string, patch: Partial<Goal>) => {
    try {
      await fetch(`/api/workspaces/${ws.selectedWorkspaceId}/goals/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      refetch();
    } catch { toast.error('Failed to update goal'); }
  }, [ws.selectedWorkspaceId, refetch]);

  const handleDeleteGoal = useCallback(async (id: string) => {
    try {
      await fetch(`/api/workspaces/${ws.selectedWorkspaceId}/goals/${id}`, { method: 'DELETE' });
      toast.success('Goal deleted');
      refetch();
    } catch { toast.error('Failed to delete goal'); }
  }, [ws.selectedWorkspaceId, refetch]);

  const handleAddKeyResult = useCallback(async (goalId: string, kr: Partial<KeyResult>) => {
    try {
      await fetch(`/api/workspaces/${ws.selectedWorkspaceId}/goals/${goalId}/key-results`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: kr.title, targetValue: kr.targetValue ?? 100, currentValue: 0, unit: '%' }),
      });
      refetch();
    } catch { toast.error('Failed to add key result'); }
  }, [ws.selectedWorkspaceId, refetch]);

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading goals…</div>;

  return (
    <GoalsView
      goals={goals}
      keyResults={keyResults}
      onAddGoal={handleAddGoal as any}
      onUpdateGoal={handleUpdateGoal}
      onDeleteGoal={handleDeleteGoal}
      onAddKeyResult={handleAddKeyResult as any}
      onUpdateKeyResult={() => {}}
      onDeleteKeyResult={() => {}}
    />
  );
}
