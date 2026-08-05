'use client';

import React, { useMemo } from 'react';
import { Calendar, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import {
  COLORS, STATUS_META, TEAM, TODAY, CURRENT_USER_ID,
  teamById, getDueDateStatus, DUE_STATUS, dueDateOffsetLabel,
  type Task, type Tag,
} from '@/features/flowdeck/model';
import { TaskCheckbox, TagPills, Avatar, SectionHeader, FF } from '../ui';
import { useViewport } from '../../hooks/useViewport';

export function MyTasksView({
  tasksByProject, tagsByProject,
  onOpenTask, onToggleComplete,
}: {
  tasksByProject: Record<string, Task[]>;
  tagsByProject: Record<string, Tag[]>;
  onOpenTask: (id: string, projectId: string) => void;
  onToggleComplete: (id: string, projectId: string) => void;
}) {
  const { isMobile } = useViewport();
  const todayStr = TODAY.toISOString().slice(0, 10);

  /* Aggregate all tasks assigned to current user across all projects */
  const myTasks = useMemo(() => {
    const result: (Task & { _projectId: string })[] = [];
    for (const [pid, ptasks] of Object.entries(tasksByProject)) {
      for (const t of ptasks) {
        if (t.assignee === CURRENT_USER_ID) {
          result.push({ ...t, _projectId: pid });
        }
      }
    }
    return result;
  }, [tasksByProject]);

  /* Build a unified tag map for all projects */
  const allTagMap = useMemo(() => {
    const map: Record<string, Tag> = {};
    for (const tags of Object.values(tagsByProject)) {
      for (const t of tags) map[t.id] = t;
    }
    return map;
  }, [tagsByProject]);

  /* Categorize */
  const overdue = myTasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < todayStr);
  const dueToday = myTasks.filter(t => t.status !== 'done' && (t.dueDate === todayStr || (!t.dueDate && t.start <= todayStr && t.start > new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 7).toISOString().slice(0, 10))));
  const upcoming = myTasks.filter(t => {
    if (t.status === 'done') return false;
    if (overdue.some(o => o.id === t.id) || dueToday.some(d => d.id === t.id)) return false;
    const due = t.dueDate || t.start;
    const weekLater = new Date(TODAY);
    weekLater.setDate(weekLater.getDate() + 14);
    return due <= weekLater.toISOString().slice(0, 10);
  });
  const later = myTasks.filter(t => {
    if (t.status === 'done') return false;
    if (overdue.some(o => o.id === t.id) || dueToday.some(d => d.id === t.id) || upcoming.some(u => u.id === t.id)) return false;
    return true;
  });
  const completed = myTasks.filter(t => t.status === 'done').sort((a, b) => (b.dueDate || b.start).localeCompare(a.dueDate || a.start)).slice(0, 5);

  function renderSection(title: string, icon: React.ReactNode, items: (Task & { _projectId: string })[], accentColor?: string) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {icon}
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FF, color: COLORS.ink }}>{title}</span>
          <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{items.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(t => {
            const dueStatus = getDueDateStatus(t.dueDate, t.status);
            const dueMeta = DUE_STATUS[dueStatus];
            const member = teamById[t.assignee];
            const projNames: Record<string, string> = { p1: 'Website Relaunch', p2: 'Mobile App Launch' };
            return (
              <div
                key={t.id}
                style={{
                  background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12,
                  padding: isMobile ? '12px 14px' : '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', transition: 'box-shadow 0.15s',
                }}
                onClick={() => onOpenTask(t.id, t._projectId)}
              >
                <TaskCheckbox done={t.status === 'done'} onToggle={e => { e.stopPropagation(); onToggleComplete(t.id, t._projectId); }} size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: isMobile ? 14 : 13.5, fontWeight: 600, fontFamily: FF,
                      textDecoration: t.status === 'done' ? 'line-through' : 'none',
                      color: t.status === 'done' ? COLORS.gray : COLORS.ink,
                      lineHeight: 1.3,
                    }}>{t.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, color: COLORS.grayLight, fontFamily: FF }}>{projNames[t._projectId] || t._projectId}</span>
                    {t.tags && t.tags.length > 0 && <TagPills tags={t.tags} tagMap={allTagMap} />}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {t.dueDate && dueStatus !== 'none' && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, fontFamily: FF, padding: '3px 8px', borderRadius: 9999,
                      background: dueMeta.bg, color: dueMeta.color, whiteSpace: 'nowrap',
                    }}>{dueDateOffsetLabel(t.dueDate, t.status)}</span>
                  )}
                  {member && <Avatar id={member.id} size={24} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const totalDone = myTasks.filter(t => t.status === 'done').length;
  const totalMy = myTasks.length;
  const totalPending = totalMy - totalDone;

  return (
    <div>
      <SectionHeader title="My Tasks" subtitle={`${totalPending} pending · ${totalDone} completed`} />

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {overdue.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <AlertTriangle size={15} color="#DC2626" />
            <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: FF, color: '#991B1B' }}>{overdue.length} overdue</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <Calendar size={15} color="#D97706" />
          <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: FF, color: '#92400E' }}>{dueToday.length} due today</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#F3F4F6', border: `1px solid ${COLORS.line}` }}>
          <Clock size={15} color={COLORS.gray} />
          <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: FF, color: COLORS.gray }}>{totalPending} remaining</span>
        </div>
      </div>

      {myTasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: COLORS.gray, fontFamily: FF }}>
          <CheckCircle2 size={40} color={COLORS.line} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No tasks assigned to you</div>
          <div style={{ fontSize: 13 }}>Tasks assigned to you will appear here.</div>
        </div>
      )}

      {renderSection('Overdue', <AlertTriangle size={16} color="#DC2626" />, overdue, '#DC2626')}
      {renderSection('Today', <Calendar size={16} color="#D97706" />, dueToday, '#D97706')}
      {renderSection('Upcoming', <Clock size={16} color="#0891B2" />, upcoming, '#0891B2')}
      {renderSection('Later', <Clock size={16} color={COLORS.gray} />, later)}
      {completed.length > 0 && renderSection('Recently completed', <CheckCircle2 size={16} color={COLORS.green} />, completed)}
    </div>
  );
}
