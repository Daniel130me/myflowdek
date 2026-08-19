'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AutomationsView } from '@/features/flowdeck/components/views';
import { useAutomations } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getSingleParam } from '@/shared/utils/routeParams';
import { toast } from 'sonner';
import type { AutomationRule } from '@/features/flowdeck/model';

export default function ProjectAutomationsPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  useEffect(() => {
    if (projectId && state.currentProjectId !== projectId) {
      state.syncProjectFromRoute(projectId);
    }
  }, [projectId, state]);

  const { data, loading, refetch } = useAutomations(projectId);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);

  useEffect(() => {
    if (data.automations) {
      setAutomations(
        data.automations.map((a: any) => ({
          id: a.id,
          name: a.name,
          enabled: a.enabled,
          trigger: a.trigger,
          actions: a.actions,
          createdAt: a.createdAt,
        })),
      );
    }
  }, [data]);

  const handleAdd = useCallback(
    async (rule: Partial<AutomationRule>) => {
      if (!projectId) return;
      try {
        const res = await fetch(`/api/projects/${projectId}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: rule.name, trigger: rule.trigger, actions: rule.actions }),
        });
        if (!res.ok) throw new Error();
        toast.success('Automation created');
        refetch();
      } catch {
        toast.error('Failed to create automation');
      }
    },
    [projectId, refetch],
  );

  const handleUpdate = useCallback(
    async (id: string, patch: Partial<AutomationRule>) => {
      if (!projectId) return;
      try {
        await fetch(`/api/projects/${projectId}/automations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        refetch();
      } catch {
        toast.error('Failed to update automation');
      }
    },
    [projectId, refetch],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!projectId) return;
      try {
        await fetch(`/api/projects/${projectId}/automations/${id}`, { method: 'DELETE' });
        toast.success('Automation deleted');
        refetch();
      } catch {
        toast.error('Failed to delete automation');
      }
    },
    [projectId, refetch],
  );

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading automations…</div>;

  return (
    <AutomationsView
      automations={automations}
      projects={state.projects}
      tagsByProject={state.tagsByProject}
      currentProjectId={projectId}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
}
