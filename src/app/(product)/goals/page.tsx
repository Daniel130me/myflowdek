'use client';

import React, { useState, useCallback } from 'react';
import { GoalsView } from '@/features/flowdeck/components/views';
import { useWorkspaces } from '@/features/flowdeck/hooks/useWorkspaces';
import { useGoals } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { toast } from 'sonner';
import type { Goal, KeyResult } from '@/features/flowdeck/model';
import { apiUpdateKeyResult, apiDeleteKeyResult } from '@/lib/api-client';

/**
 * Goals page — backed by the real API.
 * Fetches goals from GET /api/workspaces/:id/goals and mutates via API.
 * Key results are loaded from the workspace goals list response (each goal
 * includes its keyResults) and updated/deleted via the dedicated endpoints.
 */
export default function GoalsRoutePage() {
  const ws = useWorkspaces();
  const { data, loading, refetch } = useGoals(ws.selectedWorkspaceId);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);

  // Sync API data into local state for the view. The workspace goals
  // response includes each goal's keyResults — flatten them into a single
  // list so the GoalsView can filter by goalId.
  React.useEffect(() => {
    if (data.goals) {
      const mappedGoals: Goal[] = [];
      const mappedKrs: KeyResult[] = [];
      for (const g of data.goals as Array<Record<string, unknown>>) {
        mappedGoals.push({
          id: g.id as string,
          title: g.title as string,
          description: (g.description as string) ?? '',
          status: (String(g.status ?? 'not_started').toLowerCase()) as Goal['status'],
          startDate: (g.startDate as string) ?? '',
          endDate: (g.endDate as string) ?? '',
          parentId: (g.parentId as string) ?? null,
        });
        const krs = (g.keyResults as Array<Record<string, unknown>>) ?? [];
        for (const kr of krs) {
          mappedKrs.push({
            id: kr.id as string,
            goalId: g.id as string,
            title: kr.title as string,
            targetValue: Number(kr.targetValue ?? 0),
            currentValue: Number(kr.currentValue ?? 0),
            unit: (kr.unit as string) ?? '',
          });
        }
      }
      setGoals(mappedGoals);
      setKeyResults(mappedKrs);
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
    if (!ws.selectedWorkspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${ws.selectedWorkspaceId}/goals/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Failed');
      refetch();
    } catch { toast.error('Failed to update goal'); }
  }, [ws.selectedWorkspaceId, refetch]);

  const handleDeleteGoal = useCallback(async (id: string) => {
    if (!ws.selectedWorkspaceId) return;
    try {
      await fetch(`/api/workspaces/${ws.selectedWorkspaceId}/goals/${id}`, { method: 'DELETE' });
      toast.success('Goal deleted');
      refetch();
    } catch { toast.error('Failed to delete goal'); }
  }, [ws.selectedWorkspaceId, refetch]);

  const handleAddKeyResult = useCallback(async (goalId: string, kr: Partial<KeyResult>) => {
    if (!ws.selectedWorkspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${ws.selectedWorkspaceId}/goals/${goalId}/key-results`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: kr.title, targetValue: kr.targetValue ?? 100, currentValue: 0, unit: '%' }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Key result added');
      refetch();
    } catch { toast.error('Failed to add key result'); }
  }, [ws.selectedWorkspaceId, refetch]);

  const handleUpdateKeyResult = useCallback(async (id: string, patch: Partial<KeyResult>) => {
    if (!ws.selectedWorkspaceId) return;
    // Find the KR's goalId — the API route is nested under the goal.
    const kr = keyResults.find(k => k.id === id);
    if (!kr) return;
    // Optimistic local update so the progress bar updates instantly.
    const snapshot = keyResults;
    setKeyResults(prev => prev.map(k => k.id === id ? { ...k, ...patch } : k));
    const res = await apiUpdateKeyResult(ws.selectedWorkspaceId, kr.goalId, id, patch);
    if (res.ok) return;
    setKeyResults(snapshot);
    toast.error('Failed to update key result', { description: res.error });
  }, [ws.selectedWorkspaceId, keyResults]);

  const handleDeleteKeyResult = useCallback(async (id: string) => {
    if (!ws.selectedWorkspaceId) return;
    const kr = keyResults.find(k => k.id === id);
    if (!kr) return;
    // Optimistic local delete + rollback on failure.
    const snapshot = keyResults;
    setKeyResults(prev => prev.filter(k => k.id !== id));
    const res = await apiDeleteKeyResult(ws.selectedWorkspaceId, kr.goalId, id);
    if (res.ok) {
      toast.success('Key result deleted');
      return;
    }
    setKeyResults(snapshot);
    toast.error('Failed to delete key result', { description: res.error });
  }, [ws.selectedWorkspaceId, keyResults]);

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading goals…</div>;

  return (
    <GoalsView
      goals={goals}
      keyResults={keyResults}
      onAddGoal={handleAddGoal as any}
      onUpdateGoal={handleUpdateGoal}
      onDeleteGoal={handleDeleteGoal}
      onAddKeyResult={handleAddKeyResult as any}
      onUpdateKeyResult={handleUpdateKeyResult}
      onDeleteKeyResult={handleDeleteKeyResult}
    />
  );
}
