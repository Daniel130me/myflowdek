'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { FONT_FAMILY as FF, COLORS } from '@/features/flowdeck/model';
import { routes } from '@/shared/navigation/routes';
import { formatDate } from '@/shared/utils/format';

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
  // A failed list fetch used to be swallowed (.catch(() => {})) and rendered
  // as "No notifications" — indistinguishable from a genuinely empty inbox
  // (audit Table 5.1). Track it so the panel can offer a retry.
  const [listError, setListError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Close and hand keyboard focus back to the bell (audit Table 6.1 —
  // the panel is a transient dialog; focus must not be lost on dismiss).
  const closePanel = useCallback(() => {
    setOpen(false);
    bellRef.current?.focus();
  }, []);

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

  // Close on Escape (audit H-23 — the cheat sheet promises Esc dismisses).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

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
  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (!res.ok) throw new Error('Failed to load notifications');
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setListError(false);
    } catch {
      setListError(true);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadList();
  }, [open, loadList]);

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
    return formatDate(d);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={bellRef}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
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
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Notifications"
          style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          /* Never wider than the phone viewport minus 12px gutters on each
             side — a fixed 360px was nearly full-bleed at 390px
             (audit Table 6.1). */
          width: 'min(360px, calc(100vw - 24px))', maxHeight: 480, overflowY: 'auto',
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
                onClick={closePanel}
                aria-label="Close notifications"
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
          ) : listError ? (
            <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>Couldn't load notifications.</div>
              <button
                onClick={() => void loadList()}
                style={{ border: `1px solid ${COLORS.line}`, background: '#F3F4F6', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: FF, color: COLORS.ink }}
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: COLORS.gray, fontSize: 13 }}>
              No notifications
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                type="button"
                /* Screen readers must get the unread state, not just the
                   orange dot (audit Table 6.1). */
                aria-label={`${n.readAt ? '' : 'Unread: '}${n.message}, ${fmtTime(n.createdAt)}`}
                onClick={() => {
                  if (!n.readAt) void handleMarkRead(n.id);
                  // Navigate to the related project/task if available.
                  if (n.projectId && n.taskId) {
                    router.push(routes.task(n.projectId, n.taskId));
                  } else if (n.projectId) {
                    router.push(routes.projectOverview(n.projectId));
                  }
                  closePanel();
                }}
                style={{
                  width: '100%', textAlign: 'left', border: 'none',
                  font: 'inherit', cursor: 'pointer',
                  padding: '10px 16px', borderBottom: `1px solid ${COLORS.lineLight || '#F3F4F6'}`,
                  display: 'flex', gap: 10,
                  background: n.readAt ? 'transparent' : 'rgba(254,128,41,0.04)',
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
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
