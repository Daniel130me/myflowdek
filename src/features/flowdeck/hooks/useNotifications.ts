'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { NotificationItem } from '@/features/flowdeck/model';

/**
 * Shape returned by GET /api/notifications.
 *
 * The server stores notifications in the `Notification` table (distinct
 * from the project-wide ActivityEntry feed). Each row is pre-rendered with
 * a human-readable `message` at write time so the list is cheap to read.
 */
export interface ApiNotification {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  actorId: string | null;
  projectId: string | null;
  taskId: string | null;
}

/** Frontend notification shape (mapped from the API response). */
export interface InboxNotification extends NotificationItem {
  actorId: string;
  projectId: string;
  taskId: string;
  read: boolean;
  timestamp: string;
}

function mapNotification(api: ApiNotification): InboxNotification {
  // Map server notification types to the frontend's existing InboxEntry
  // type vocabulary so the view's icon/colour table keeps working.
  const typeMap: Record<string, NotificationItem['type']> = {
    task_assigned: 'assignment',
    mentioned: 'mentioned',
    replied: 'comment',
    due_soon: 'due_date',
    overdue: 'due_date',
    invitation: 'assignment',
    approval: 'status_change',
    status_changed: 'status_change',
  };
  return {
    id: api.id,
    type: typeMap[api.type] ?? 'status_change',
    taskId: api.taskId ?? '',
    projectId: api.projectId ?? '',
    message: api.message,
    actorId: api.actorId ?? '',
    read: !!api.readAt,
    createdAt: api.createdAt,
    timestamp: api.createdAt,
  };
}

interface UseNotificationsOptions {
  unreadOnly?: boolean;
  limit?: number;
  /** Skip the initial fetch (useful for tests / stories). */
  skip?: boolean;
}

/**
 * Hook that fetches the authenticated user's inbox from
 * `GET /api/notifications`.
 *
 * Replaces the old pattern of synthesizing notifications from local
 * `state.activityByProject` + `state.commentsByProject` — the server now
 * creates real Notification rows on assign/reply/mention/due-date and
 * stores them per-user, so the inbox is consistent across devices and
 * sessions.
 *
 * Exposes:
 *   - `notifications` — the fetched list, newest first
 *   - `unreadCount` — total unread (independent of the limit/unreadOnly filter)
 *   - `loading` / `error`
 *   - `refetch()` — manual refresh
 *   - `markAsRead(id)` — `PATCH /api/notifications/:id/read` + optimistic update
 *   - `markAllAsRead()` — `POST /api/notifications/read-all` + optimistic update
 */
export function useNotifications(opts: UseNotificationsOptions = {}) {
  const { unreadOnly = false, limit = 50, skip = false } = opts;
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchTokenRef = useRef(0);

  const refetch = useCallback(async () => {
    const token = ++fetchTokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (unreadOnly) params.set('unreadOnly', 'true');
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      const url = `/api/notifications${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load notifications');
      const data = await res.json();
      if (token !== fetchTokenRef.current) return;
      setNotifications((data.notifications ?? []).map(mapNotification));
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      if (token !== fetchTokenRef.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (token === fetchTokenRef.current) setLoading(false);
    }
  }, [unreadOnly, limit]);

  useEffect(() => {
    if (skip) return;
    refetch();
  }, [refetch, skip]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic local update — flip read=true and decrement the count.
    let wasUnread = false;
    setNotifications(prev => prev.map(n => {
      if (n.id !== id) return n;
      if (!n.read) wasUnread = true;
      return { ...n, read: true };
    }));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark notification as read');
    } catch {
      // Roll back on failure.
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
      if (wasUnread) setUnreadCount(c => c + 1);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const previouslyUnread = notifications.filter(n => !n.read).length;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark all notifications as read');
    } catch {
      // Roll back on failure.
      setNotifications(prev => prev.map((n, i) => {
        const original = notifications[i];
        return original ? { ...n, read: original.read } : n;
      }));
      setUnreadCount(previouslyUnread);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
  };
}
