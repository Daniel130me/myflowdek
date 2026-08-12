'use client';

import React, { useMemo, useState } from 'react';
import { MessageSquare, UserPlus, CalendarClock, ArrowRightLeft, CheckCircle2, AtSign, Check, Filter, Bell, BellOff, CheckCheck } from 'lucide-react';
import { COLORS, type Project } from '@/features/flowdeck/model';
import { Avatar, SectionHeader, FF, useMemberDirectory } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import type { InboxNotification } from '../../hooks/useNotifications';

interface InboxViewProps {
  /** Fetched notifications from `useNotifications`. */
  notifications: InboxNotification[];
  /** Total unread count (drives the badge + filter pill). */
  unreadCount: number;
  /** Loading flag from the hook. */
  loading: boolean;
  /** Mark a single notification as read. */
  onMarkAsRead: (id: string) => void;
  /** Mark every notification as read. */
  onMarkAllAsRead: () => void;
  /** Project registry (used to resolve project colour when the API doesn't
   *  return one — the notifications endpoint only returns the projectId). */
  projects: Record<string, Project>;
  onOpenTask?: (projectId: string, taskId: string) => void;
}

const ICON_MAP = {
  comment: MessageSquare,
  assignment: UserPlus,
  due_date: CalendarClock,
  status_change: ArrowRightLeft,
  completed: CheckCircle2,
  mentioned: AtSign,
};

const TYPE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  comment: { label: 'Comment', color: '#7C3AED', bg: '#EDE9FE' },
  assignment: { label: 'Assigned', color: '#0891B2', bg: '#CFFAFE' },
  due_date: { label: 'Due Date', color: '#D97706', bg: '#FEF3C7' },
  status_change: { label: 'Status', color: '#FE8029', bg: '#FFF4EB' },
  completed: { label: 'Completed', color: '#16A34A', bg: '#DCFCE7' },
  mentioned: { label: 'Mentioned', color: '#DB2777', bg: '#FCE7F3' },
};

/**
 * Inbox view — renders the authenticated user's notification feed.
 *
 * Phase 4 (item 8): the view no longer derives notifications from
 * `state.activityByProject` + `state.commentsByProject`. The parent passes
 * a fetched list from `useNotifications` (which calls
 * `GET /api/notifications`). Actor names are resolved via the
 * MemberDirectory; project colour falls back to the project registry, then
 * to a neutral grey.
 */
export function InboxView({
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  projects,
  onOpenTask,
}: InboxViewProps) {
  const { isMobile } = useViewport();
  const { lookup } = useMemberDirectory();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = useMemo(
    () => (filter === 'unread' ? notifications.filter(n => !n.read) : notifications),
    [notifications, filter],
  );

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12.5, padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${COLORS.line}`, background: active ? COLORS.ink : '#F3F4F6',
    color: active ? '#FFFFFF' : COLORS.ink, fontWeight: 600, fontFamily: FF, minHeight: 36,
    transition: 'all 0.15s',
  });

  function fmtTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div>
      <SectionHeader
        title="Inbox"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
      />

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        <Filter size={14} color={COLORS.gray} />
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={filterBtnStyle(filter === f)}>
            {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            title="Mark all as read"
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              border: `1px solid ${COLORS.line}`, background: '#FFFFFF',
              borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, fontFamily: FF, color: COLORS.accent,
              minHeight: 36,
            }}
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: COLORS.gray, fontFamily: FF }}>
            Loading notifications…
          </div>
        )}
        {filtered.map(entry => {
          const Icon = ICON_MAP[entry.type] || Bell;
          const typeMeta = TYPE_LABEL[entry.type] || TYPE_LABEL.status_change;
          const actor = lookup(entry.actorId);
          const project = projects[entry.projectId];
          const projectColor = project?.color ?? COLORS.gray;
          const projectName = project?.name ?? '';
          const timeStr = fmtTime(entry.timestamp);

          return (
            <div
              key={entry.id}
              onClick={() => {
                if (!entry.read) onMarkAsRead(entry.id);
                if (entry.projectId && entry.taskId) {
                  onOpenTask?.(entry.projectId, entry.taskId);
                }
              }}
              style={{
                display: 'flex', gap: 12, padding: isMobile ? '12px 14px' : '14px 16px',
                borderRadius: 12, border: `1px solid ${COLORS.line}`,
                background: entry.read ? '#FFFFFF' : 'rgba(254,128,41,0.04)',
                cursor: onOpenTask ? 'pointer' : 'default', transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              {actor ? (
                <Avatar id={entry.actorId} size={isMobile ? 36 : 40} />
              ) : (
                <div style={{
                  width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: '50%',
                  background: COLORS.graySoft, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={18} color={COLORS.gray} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FF, padding: '2px 8px', borderRadius: 6, background: typeMeta.bg, color: typeMeta.color }}>{typeMeta.label}</span>
                  {projectName && (
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FF, padding: '2px 8px', borderRadius: 6, background: `${projectColor}18`, color: projectColor }}>{projectName}</span>
                  )}
                </div>
                <div style={{ fontSize: isMobile ? 13 : 13.5, fontFamily: FF, color: COLORS.ink, lineHeight: 1.45, marginBottom: 4 }}>{entry.message}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>{timeStr}</span>
                  {actor?.name && (
                    <>
                      <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>·</span>
                      <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>{actor.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ flexShrink: 0, paddingTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                {!entry.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.accent }} />}
                {entry.read && <Check size={14} color={COLORS.grayLight} />}
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: COLORS.gray, fontFamily: FF }}>
            <BellOff size={32} color={COLORS.line} style={{ display: 'inline-block', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No notifications</div>
            <div style={{ fontSize: 13 }}>Activity from your projects will appear here.</div>
          </div>
        )}
      </div>
    </div>
  );
}
