'use client';

import React, { useState, useMemo } from 'react';
import { COLORS, TEAM, MEMBER_CAPACITY, type Task, type TimeLog, TODAY, addDays } from '@/features/flowdeck/model';
import { Avatar, SectionHeader, FF } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import { ChevronDown, ChevronRight, AlertTriangle, Clock } from 'lucide-react';

export function TeamView({ tasks, timeLogs }: { tasks: Task[]; timeLogs?: TimeLog[] }) {
  const { isMobile } = useViewport();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return TEAM.map(m => {
      const mine = tasks.filter(t => t.assignee === m.id);
      const active = mine.filter(t => t.status !== 'done');
      const done = mine.filter(t => t.status === 'done');
      const capacity = MEMBER_CAPACITY[m.id] || 40;

      /* Estimated hours: 6h/day * duration for active tasks */
      const estimatedHours = active.reduce((sum, t) => sum + t.duration * 6, 0);

      /* Actual logged hours */
      const memberTimeLogs = (timeLogs || []).filter(tl => tl.userId === m.id);
      const loggedMinutes = memberTimeLogs.reduce((sum, tl) => sum + tl.minutes, 0);
      const loggedHours = Math.round(loggedMinutes / 60 * 10) / 10;

      /* Allocation: estimated hours / capacity ratio (capped) */
      const allocation = Math.min(150, Math.round((estimatedHours / capacity) * 100));

      /* Overlapping tasks (tasks whose date ranges overlap with each other) */
      const todayStr = TODAY.toISOString().slice(0, 10);
      const thisWeek = active.filter(t => {
        const end = addDays(t.start, t.duration - 1);
        return t.start <= todayStr && end.toISOString().slice(0, 10) >= todayStr;
      });

      return {
        ...m, count: mine.length, active: active.length, done: done.length,
        capacity, estimatedHours, loggedHours, allocation,
        thisWeek: thisWeek.length, activeTasks: active,
      };
    });
  }, [tasks, timeLogs]);

  const totalCapacity = rows.reduce((s, r) => s + r.capacity, 0);
  const totalAllocated = rows.reduce((s, r) => s + r.estimatedHours, 0);
  const totalLogged = rows.reduce((s, r) => s + r.loggedHours, 0);

  return (
    <div>
      <SectionHeader title="Team Workload" subtitle={`${TEAM.length} members · ${totalCapacity}h weekly capacity`} />

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 20 }}>
        {[{ label: 'Total Allocated', value: `${totalAllocated}h`, sub: `${Math.round(totalAllocated / totalCapacity * 100)}% of capacity`, color: totalAllocated / totalCapacity > 0.8 ? COLORS.red : COLORS.accent },
          { label: 'Total Logged', value: `${totalLogged}h`, sub: `${rows.reduce((s, r) => s + (r.count - r.active), 0)} tasks completed`, color: COLORS.teal },
          { label: 'Active This Week', value: `${rows.reduce((s, r) => s + r.thisWeek, 0)}`, sub: 'tasks in progress now', color: COLORS.purple },
        ].map(stat => (
          <div key={stat.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: isMobile ? 12 : 16 }}>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, fontFamily: FF, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.ink, marginTop: 2 }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Member cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? 10 : 14 }}>
        {rows.map(r => {
          const expanded = expandedId === r.id;
          const overAllocated = r.allocation > 100;
          const barColor = overAllocated ? COLORS.red : r.allocation > 80 ? COLORS.amber : COLORS.green;

          return (
            <div key={r.id} style={{ background: COLORS.card, border: `1px solid ${overAllocated ? COLORS.red : COLORS.line}`, borderRadius: 12, padding: isMobile ? 14 : 16, transition: 'border-color 0.15s' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar id={r.id} size={isMobile ? 38 : 42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 15, fontFamily: FF, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.name}
                    {overAllocated && <AlertTriangle size={14} color={COLORS.red} />}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{r.role} · {r.capacity}h/week</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, fontFamily: FF, color: barColor }}>{r.allocation}%</div>
                  <div style={{ fontSize: 10, color: COLORS.gray, fontFamily: FF }}>allocated</div>
                </div>
              </div>

              {/* Allocation bar */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: COLORS.gray, marginBottom: 5, fontFamily: FF }}>
                  <span>{r.active} active task{r.active !== 1 ? 's' : ''} · {r.estimatedHours}h estimated</span>
                  <span>{r.loggedHours}h logged</span>
                </div>
                <div style={{ height: 8, background: COLORS.lineLight, borderRadius: 4, position: 'relative' }}>
                  {/* Capacity fill (full width = 100%) */}
                  <div style={{ width: `${Math.min(r.allocation, 100)}%`, height: '100%', borderRadius: 4, background: barColor, transition: 'width 0.3s' }} />
                  {/* Overallocation indicator */}
                  {overAllocated && (
                    <div style={{ position: 'absolute', left: '100%', top: -2, width: 2, height: 12, background: COLORS.red, borderRadius: 1 }} />
                  )}
                </div>
                {overAllocated && (
                  <div style={{ fontSize: 11, color: COLORS.red, fontFamily: FF, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={11} /> Over-allocated by {r.allocation - 100}%
                  </div>
                )}
              </div>

              {/* Expandable task list */}
              {r.activeTasks.length > 0 && (
                <button
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, border: 'none', background: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: COLORS.teal, fontFamily: FF, padding: '4px 0' }}
                >
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  {expanded ? 'Hide' : 'Show'} {r.activeTasks.length} task{r.activeTasks.length !== 1 ? 's' : ''}
                </button>
              )}
              {expanded && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                  {r.activeTasks.map(t => {
                    const taskLogs = (timeLogs || []).filter(tl => tl.taskId === t.id);
                    const taskMins = taskLogs.reduce((s, tl) => s + tl.minutes, 0);
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: COLORS.graySoft, fontSize: 12, fontFamily: FF }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: COLORS.ink, fontWeight: 500 }}>{t.name}</span>
                        <span style={{ fontSize: 11, color: COLORS.gray, flexShrink: 0 }}>{t.duration * 6}h est.</span>
                        {taskMins > 0 && (
                          <span style={{ fontSize: 11, color: COLORS.teal, fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Clock size={10} /> {Math.round(taskMins / 60 * 10) / 10}h
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
