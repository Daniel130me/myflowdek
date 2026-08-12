'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { FONT_FAMILY as FF, COLORS } from '@/features/flowdeck/model';
import { routes } from '@/shared/navigation/routes';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  actor?: { id: string; name: string | null; avatarColor: string | null };
  projectId?: string | null;
  taskId?: string | null;
}

/**
 * Notification bell icon with unread badge + dropdown panel.
 *
 * Polls GET /api/notifications?count=true every 30s for the unread count.
 * When the bell is clicked, opens a dropdown showing recent notifications.
 * Supports mark-one-read (PATCH) and mark-all-read (POST).
 *
 * Polling is acceptable initially; realtime delivery can come later.
 */
const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Poll unread count.
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications?count=true');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch { /* network error — keep last count */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Fetch full list when opened.
  useEffect(() => {
    if (!open) return;
    setLoadingList(true);
    fetch('/api/notifications?limit=20')
      .then(res => res.json())
      .then(data => setNotifications(data.notifications ?? []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [open]);

  const handleMarkRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  }, []);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 36, height: 36, borderRadius: 10, border: 'none',
          background: 'transparent', cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Notifications"
      >
        <Bell size={18} color={COLORS.gray} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16,
            borderRadius: 8, background: '#DC2626', color: '#fff',
            fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '0 4px', fontFamily: FF,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: 360, maxHeight: 480, overflowY: 'auto',
          background: '#fff', borderRadius: 12,
          border: `1px solid ${COLORS.line}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 200, fontFamily: FF,
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${COLORS.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
                >
                  <CheckCheck size={16} color={COLORS.accent} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} color={COLORS.gray} />
              </button>
            </div>
          </div>

          {/* List */}
          {loadingList ? (
            <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13 }}>
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: COLORS.gray, fontSize: 13 }}>
              No notifications
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '10px 16px', borderBottom: `1px solid ${COLORS.lineLight || '#F3F4F6'}`,
                  display: 'flex', gap: 10, cursor: 'pointer',
                  background: n.readAt ? 'transparent' : 'rgba(254,128,41,0.04)',
                }}
                onClick={() => {
                  if (!n.readAt) handleMarkRead(n.id);
                  // Navigate to the related project/task if available.
                  if (n.projectId && n.taskId) {
                    router.push(routes.task(n.projectId, n.taskId));
                  } else if (n.projectId) {
                    router.push(routes.projectOverview(n.projectId));
                  }
                  setOpen(false);
                }}
              >
                {/* Actor avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: n.actor?.avatarColor ?? COLORS.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 600,
                }}>
                  {n.actor?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: COLORS.ink, fontWeight: n.readAt ? 400 : 600 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
                    {fmtTime(n.createdAt)}
                  </div>
                </div>
                {!n.readAt && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.accent, flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
