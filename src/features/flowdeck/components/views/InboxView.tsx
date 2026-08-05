'use client';

import React, { useMemo, useState } from 'react';
import { MessageSquare, UserPlus, CalendarClock, ArrowRightLeft, CheckCircle2, AtSign, Check, Filter, Bell, BellOff } from 'lucide-react';
import { COLORS, TEAM, teamById, fmtDate, type Task, type ActivityEntry, type Comment, type Project } from '@/features/flowdeck/model';
import { Avatar, SectionHeader, FF } from '../ui';
import { useViewport } from '../../hooks/useViewport';

interface InboxViewProps {
  tasksByProject: Record<string, Task[]>;
  commentsByProject: Record<string, Comment[]>;
  activityByProject: Record<string, ActivityEntry[]>;
  projects: Record<string, Project>;
  currentUserId: string;
  onOpenTask?: (projectId: string, taskId: string) => void;
}

interface InboxEntry {
  id: string;
  type: 'comment' | 'assignment' | 'due_date' | 'status_change' | 'completed' | 'mentioned';
  message: string;
  actorId: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  taskId: string;
  taskName: string;
  timestamp: string;
  read: boolean;
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

export function InboxView({ tasksByProject, commentsByProject, activityByProject, projects, currentUserId, onOpenTask }: InboxViewProps) {
  const { isMobile } = useViewport();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const entries = useMemo(() => {
    const items: InboxEntry[] = [];

    for (const [projectId, activities] of Object.entries(activityByProject)) {
      const proj = projects[projectId];
      if (!proj) continue;
      const tasks = tasksByProject[projectId] || [];

      for (const act of activities) {
        const task = tasks.find(t => t.id === act.taskId);
        if (!task) continue;

        // Only show activities from other users or relevant to current user
        if (act.authorId === currentUserId && act.type !== 'completed') continue;

        let type: InboxEntry['type'] = 'status_change';
        if (act.type === 'comment') type = 'comment';
        else if (act.type === 'completed') type = 'completed';
        else if (act.type === 'status_change') type = 'status_change';
        else if (act.type === 'priority_change') type = 'status_change';
        else if (act.type === 'due_date_change') type = 'due_date';
        else if (act.type === 'tag_added' || act.type === 'tag_removed') type = 'status_change';
        else if (act.type === 'progress_change') type = 'status_change';

        items.push({
          id: act.id,
          type,
          message: act.description,
          actorId: act.authorId,
          projectId,
          projectName: proj.name,
          projectColor: proj.color,
          taskId: act.taskId,
          taskName: task.name,
          timestamp: act.timestamp,
          read: false,
        });
      }
    }

    // Add comments as notifications (for tasks the current user follows or is assigned to)
    for (const [projectId, comments] of Object.entries(commentsByProject)) {
      const proj = projects[projectId];
      if (!proj) continue;
      const tasks = tasksByProject[projectId] || [];

      for (const c of comments) {
        if (c.authorId === currentUserId) continue;
        const task = tasks.find(t => t.id === c.taskId);
        if (!task) continue;
        // Only show if the task is assigned to current user or current user is a follower
        const isRelevant = task.assignee === currentUserId || (task.followers || []).includes(currentUserId);
        if (!isRelevant) continue;

        const actor = teamById[c.authorId];
        const textPreview = c.text.length > 80 ? c.text.slice(0, 80) + '...' : c.text;
        // Check for @mention
        const isMention = c.text.toLowerCase().includes(`@${(teamById[currentUserId]?.name || '').toLowerCase().split(' ')[0]}`);

        items.push({
          id: 'n_' + c.id,
          type: isMention ? 'mentioned' : 'comment',
          message: `${actor?.name || 'Someone'} commented: "${textPreview}"`,
          actorId: c.authorId,
          projectId,
          projectName: proj.name,
          projectColor: proj.color,
          taskId: c.taskId,
          taskName: task.name,
          timestamp: c.createdAt,
          read: false,
        });
      }
    }

    // Sort by timestamp, newest first
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items;
  }, [tasksByProject, commentsByProject, activityByProject, projects, currentUserId]);

  const filtered = filter === 'unread' ? entries : entries;
  const unreadCount = entries.length; // All are unread in demo

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12.5, padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${COLORS.line}`, background: active ? COLORS.ink : '#F3F4F6',
    color: active ? '#FFFFFF' : COLORS.ink, fontWeight: 600, fontFamily: FF, minHeight: 36,
    transition: 'all 0.15s',
  });

  return (
    <div>
      <SectionHeader title="Inbox" subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`} />

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        <Filter size={14} color={COLORS.gray} />
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={filterBtnStyle(filter === f)}>
            {f === 'all' ? `All (${entries.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(entry => {
          const Icon = ICON_MAP[entry.type] || Bell;
          const typeMeta = TYPE_LABEL[entry.type] || TYPE_LABEL.status_change;
          const actor = teamById[entry.actorId];
          const timeStr = new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

          return (
            <div
              key={entry.id}
              onClick={() => onOpenTask?.(entry.projectId, entry.taskId)}
              style={{
                display: 'flex', gap: 12, padding: isMobile ? '12px 14px' : '14px 16px',
                borderRadius: 12, border: `1px solid ${COLORS.line}`, background: '#FFFFFF',
                cursor: onOpenTask ? 'pointer' : 'default', transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <Avatar id={entry.actorId} size={isMobile ? 36 : 40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FF, padding: '2px 8px', borderRadius: 6, background: typeMeta.bg, color: typeMeta.color }}>{typeMeta.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FF, padding: '2px 8px', borderRadius: 6, background: `${entry.projectColor}18`, color: entry.projectColor }}>{entry.projectName}</span>
                </div>
                <div style={{ fontSize: isMobile ? 13 : 13.5, fontFamily: FF, color: COLORS.ink, lineHeight: 1.45, marginBottom: 4 }}>{entry.message}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>{timeStr}</span>
                  <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>·</span>
                  <span style={{ fontSize: 11.5, color: COLORS.teal, fontFamily: FF, fontWeight: 500 }}>{entry.taskName}</span>
                </div>
              </div>
              <div style={{ flexShrink: 0, paddingTop: 2 }}>
                {!entry.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.accent }} />}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
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
