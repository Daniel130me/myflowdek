'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ApprovalsView } from '@/features/flowdeck/components/views';
import { useApprovals } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getSingleParam } from '@/shared/utils/routeParams';
import { toast } from 'sonner';
import type { ApprovalRequest } from '@/features/flowdeck/model';

export default function ProjectApprovalsPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  useEffect(() => {
    if (projectId && state.currentProjectId !== projectId) {
      state.syncProjectFromRoute(projectId);
    }
  }, [projectId, state]);

  const { data, loading, refetch } = useApprovals(projectId);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);

  useEffect(() => {
    if (data.approvals) {
      setApprovals(
        data.approvals.map((a: any) => ({
          id: a.id,
          taskId: a.taskId,
          projectId: a.projectId,
          requesterId: a.requesterId,
          approverId: a.approverId,
          status: a.status?.toLowerCase() as any,
          comment: a.comment ?? '',
          requestedAt: a.requestedAt,
          resolvedAt: a.resolvedAt,
        })),
      );
    }
  }, [data]);

  const handleAddApproval = useCallback(
    async (taskId: string, approverId: string) => {
      if (!projectId) return;
      try {
        const res = await fetch(`/api/projects/${projectId}/approvals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, approverId }),
        });
        if (!res.ok) throw new Error();
        toast.success('Approval requested');
        refetch();
      } catch {
        toast.error('Failed to request approval');
      }
    },
    [projectId, refetch],
  );

  const handleResolveApproval = useCallback(
    async (id: string, approved: boolean, comment?: string) => {
      const status = approved ? 'APPROVED' : 'REJECTED';
      try {
        const res = await fetch(`/api/approvals/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, comment }),
        });
        if (!res.ok) throw new Error();
        toast.success(`Approval ${approved ? 'approved' : 'rejected'}`);
        refetch();
      } catch {
        toast.error('Failed to resolve approval');
      }
    },
    [refetch],
  );

  const handleDeleteApproval = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/approvals/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        toast.success('Approval deleted');
        refetch();
      } catch {
        toast.error('Failed to delete approval');
      }
    },
    [refetch],
  );

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading approvals…</div>;

  return (
    <ApprovalsView
      approvals={approvals}
      tasks={state.tasks}
      projects={state.projects}
      currentProjectId={projectId}
      currentUserId={state.currentUserId}
      onAddApproval={(app: ApprovalRequest) => handleAddApproval(app.taskId, app.approverId)}
      onResolveApproval={handleResolveApproval}
      onDeleteApproval={handleDeleteApproval}
    />
  );
}
