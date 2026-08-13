'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TimesheetView } from '@/features/flowdeck/components/views';
import { useTimesheets } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { toast } from 'sonner';
import type { TimesheetEntry } from '@/features/flowdeck/model';
import {
  apiUpdateTimesheetEntry,
  apiDeleteTimesheetEntry,
  apiSubmitTimesheets,
  apiApproveTimesheets,
} from '@/lib/api-client';

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

  const handleUpdateEntry = useCallback(async (id: string, patch: Partial<TimesheetEntry>) => {
    // Optimistic local update + rollback on failure. The server rejects
    // edits to submitted entries (the route's updateTimesheet throws a 400),
    // so callers should gate edits behind `entry.submitted` in the UI.
    const snapshot = entries;
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    const res = await apiUpdateTimesheetEntry(id, patch as Record<string, unknown>);
    if (res.ok) return;
    setEntries(snapshot);
    toast.error('Failed to update time entry', { description: res.error });
  }, [entries]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    // Optimistic local delete + rollback on failure.
    const snapshot = entries;
    setEntries(prev => prev.filter(e => e.id !== id));
    const res = await apiDeleteTimesheetEntry(id);
    if (res.ok) {
      toast.success('Entry deleted');
      return;
    }
    setEntries(snapshot);
    toast.error('Failed to delete entry', { description: res.error });
  }, [entries, refetch]);

  const handleSubmit = useCallback(async (entryIds: string[]) => {
    const res = await apiSubmitTimesheets(entryIds);
    if (res.ok) {
      // Optimistically mark the entries as submitted locally; the next
      // refetch will confirm with the server's canonical state.
      setEntries(prev => prev.map(e => entryIds.includes(e.id) ? { ...e, submitted: true } : e));
      return;
    }
    toast.error('Failed to submit entries for approval', { description: res.error });
    throw new Error(res.error);
  }, []);

  const handleApprove = useCallback(async (entryIds: string[]) => {
    const res = await apiApproveTimesheets(entryIds);
    if (res.ok) {
      setEntries(prev => prev.map(e => entryIds.includes(e.id) ? { ...e, approved: true } : e));
      return;
    }
    toast.error('Failed to approve entries', { description: res.error });
    throw new Error(res.error);
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading timesheets…</div>;

  return (
    <TimesheetView
      timesheets={entries}
      projects={state.projects}
      tasks={state.tasks}
      currentProjectId={projectId ?? ''}
      currentUserId={state.currentUserId}
      onAddEntry={handleAddEntry as any}
      onUpdateEntry={handleUpdateEntry}
      onDeleteEntry={handleDeleteEntry}
      onSubmit={handleSubmit}
      onApprove={handleApprove}
    />
  );
}
