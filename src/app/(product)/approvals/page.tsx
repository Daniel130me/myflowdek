'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApprovalsView } from '@/features/flowdeck/components/views';
import { useApprovals } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { toast } from 'sonner';
import type { ApprovalRequest } from '@/features/flowdeck/model';

export default function ApprovalsRoutePage() {
  const state = useFlowDeck();
  const projectId = state.currentProjectId;
  const { data, loading, refetch } = useApprovals(projectId);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);

  useEffect(() => {
    if (data.approvals) {
      setApprovals(data.approvals.map((a: any) => ({
        id: a.id, taskId: a.taskId, projectId: a.projectId,
        requesterId: a.requesterId, approverId: a.approverId,
        status: a.status?.toLowerCase() as any, comment: a.comment ?? '',
        requestedAt: a.requestedAt, resolvedAt: a.resolvedAt,
      })));
    }
  }, [data]);

  const handleAddApproval = useCallback(async (taskId: string, approverId: string) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/approvals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, approverId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Approval requested');
      refetch();
    } catch { toast.error('Failed to request approval'); }
  }, [projectId, refetch]);

  const handleResolveApproval = useCallback(async (id: string, status: string, comment?: string) => {
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status.toUpperCase(), comment }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Approval ${status}`);
      refetch();
    } catch { toast.error('Failed to resolve approval'); }
  }, [refetch]);

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading approvals…</div>;

  return (
    <ApprovalsView
      approvals={approvals}
      projects={state.projects}
      currentProjectId={projectId ?? ''}
      tasks={state.tasks}
      currentUserId={state.currentUserId}
      onAddApproval={handleAddApproval as any}
      onResolveApproval={handleResolveApproval as any}
      onDeleteApproval={(id: string) => state.deleteApproval(id)}
    />
  );
}
