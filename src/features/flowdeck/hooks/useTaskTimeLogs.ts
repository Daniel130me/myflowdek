'use client';

import { useEffect } from 'react';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import type { TimeLog } from '@/features/flowdeck/model';

/**
 * Hydrates the store with the server's time logs for one task
 * (GET /api/tasks/:taskId/time-logs — audit H-09).
 *
 * Nothing used to fetch logs at all, so Time Tracking, Team workload and
 * Timesheet summaries showed 0h after every reload even though the rows
 * existed in Postgres. Union-by-id keeps in-flight optimistic entries.
 */
export function useTaskTimeLogs(projectId: string | null, taskId: string | null) {
  const { syncTimeLogs } = useFlowDeck();

  useEffect(() => {
    if (!projectId || !taskId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/time-logs`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data.timeLogs)) return;
        syncTimeLogs(
          projectId,
          data.timeLogs.map((l: Record<string, unknown>) => ({
            id: String(l.id),
            taskId: String(l.taskId),
            userId: String(l.userId ?? ''),
            minutes: Number(l.minutes ?? 0),
            note: String(l.note ?? ''),
            loggedAt: String(l.loggedAt ?? ''),
          })) as TimeLog[],
        );
      } catch {
        // Network errors must not wipe locally optimistic entries.
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, taskId, syncTimeLogs]);
}
