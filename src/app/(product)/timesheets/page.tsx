'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TimesheetView } from '@/features/flowdeck/components/views';
import { useTimesheets } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { toast } from 'sonner';
import type { TimesheetEntry } from '@/features/flowdeck/model';

export default function TimesheetsRoutePage() {
  const state = useFlowDeck();
  const projectId = state.currentProjectId;
  const { data, loading, refetch } = useTimesheets(projectId);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);

  useEffect(() => {
    if (data.entries) {
      setEntries(data.entries.map((e: any) => ({
        id: e.id, userId: e.userId, projectId: e.projectId, taskId: e.taskId,
        date: e.date, hours: e.hours, note: e.note ?? '',
        submitted: e.submitted, approved: e.approved, createdAt: e.createdAt,
      })));
    }
  }, [data]);

  const handleAddEntry = useCallback(async (entry: Partial<TimesheetEntry>) => {
    try {
      const res = await fetch('/api/timesheets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: entry.projectId || projectId,
          taskId: entry.taskId, date: entry.date, hours: entry.hours, note: entry.note,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Time entry added');
      refetch();
    } catch { toast.error('Failed to add time entry'); }
  }, [projectId, refetch]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    try {
      await fetch(`/api/timesheets/${id}`, { method: 'DELETE' });
      toast.success('Entry deleted');
      refetch();
    } catch { toast.error('Failed to delete entry'); }
  }, [refetch]);

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading timesheets…</div>;

  return (
    <TimesheetView
      timesheets={entries}
      projects={state.projects}
      tasks={state.tasks}
      currentProjectId={projectId ?? ''}
      currentUserId={state.currentUserId}
      onAddEntry={handleAddEntry as any}
      onUpdateEntry={() => {}}
      onDeleteEntry={handleDeleteEntry}
    />
  );
}
