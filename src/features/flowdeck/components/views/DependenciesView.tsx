'use client';

import React, { useState, useMemo } from 'react';
import { ArrowRight, ShieldAlert, Link2, Filter } from 'lucide-react';
import { COLORS, STATUS_META, TEAM, teamById, type Task } from '@/features/flowdeck/model';
import { Avatar, StatusPill, PriorityFlag, SectionHeader, FF } from '../ui';
import { useViewport } from '../../hooks/useViewport';

interface DependenciesViewProps {
  tasks: Task[];
  onOpenTask: (id: string) => void;
}

export function DependenciesView({ tasks, onOpenTask }: DependenciesViewProps) {
  const { isMobile } = useViewport();
  const [filter, setFilter] = useState<'all' | 'blocked' | 'blocking'>('all');

  // Build reverse deps map: taskId -> array of task IDs that depend on it
  const reverseDeps = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of tasks) {
      for (const depId of t.deps) {
        (map[depId] ??= []).push(t.id);
      }
    }
    return map;
  }, [tasks]);

  // Tasks with any dependency relationship
  const depTasks = useMemo(() => {
    return tasks.filter(t => {
      const hasDeps = t.deps.length > 0;
      const isBlocking = (reverseDeps[t.id]?.length || 0) > 0;
      if (filter === 'blocked') return hasDeps;
      if (filter === 'blocking') return isBlocking;
      return hasDeps || isBlocking;
    });
  }, [tasks, reverseDeps, filter]);

  // Stats
  const blockedCount = tasks.filter(t => t.deps.length > 0).length;
  const blockingCount = tasks.filter(t => (reverseDeps[t.id]?.length || 0) > 0).length;
  
  // Compute longest chain
  const longestChain = useMemo(() => {
    let max = 0;
    const visited = new Set<string>();
    function dfs(id: string, depth: number): void {
      if (depth > max) max = depth;
      if (visited.has(id)) return;
      visited.add(id);
      for (const depId of (tasks.find(t => t.id === id)?.deps || [])) {
        dfs(depId, depth + 1);
      }
      visited.delete(id);
    }
    for (const t of tasks) {
      if (t.deps.length > 0) dfs(t.id, 1);
    }
    return max;
  }, [tasks]);

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: isMobile ? 12 : 12.5, padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${COLORS.line}`, background: active ? COLORS.ink : '#F3F4F6',
    color: active ? '#FFFFFF' : COLORS.ink, fontWeight: 600, fontFamily: FF, minHeight: 36,
    transition: 'all 0.15s',
  });

  return (
    <div>
      <SectionHeader title="Dependencies" subtitle="Task dependency chains and blockers" />
      
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 20 }}>
        {[
          { label: 'Blocked Tasks', value: blockedCount, color: COLORS.amber, icon: '🚧' },
          { label: 'Blocking Tasks', value: blockingCount, color: COLORS.red, icon: '⛔' },
          { label: 'Longest Chain', value: `${longestChain} task${longestChain !== 1 ? 's' : ''}`, color: COLORS.teal, icon: '🔗' },
        ].map(stat => (
          <div key={stat.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: isMobile ? 12 : 16 }}>
            <div style={{ fontSize: 11 }}>{stat.icon}</div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, fontFamily: FF, color: stat.color, marginTop: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.ink, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        <Filter size={14} color={COLORS.gray} />
        {(['all', 'blocked', 'blocking'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={filterBtnStyle(filter === f)}>
            {f === 'all' ? 'All' : f === 'blocked' ? 'Blocked' : 'Blocking'}
          </button>
        ))}
      </div>

      {/* Dependency cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {depTasks.map(t => {
          const deps = t.deps.map(id => tasks.find(tk => tk.id === id)).filter(Boolean) as Task[];
          const blocking = (reverseDeps[t.id] || []).map(id => tasks.find(tk => tk.id === id)).filter(Boolean) as Task[];
          const assignee = teamById[t.assignee];
          const isDone = t.status === 'done';

          return (
            <div key={t.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: isMobile ? '14px 16px' : '16px 20px' }}>
              {/* Main task row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => onOpenTask(t.id)}>
                <Avatar id={t.assignee} size={isMobile ? 32 : 36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, fontFamily: FF, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? COLORS.gray : COLORS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <StatusPill status={t.status} />
                    <PriorityFlag priority={t.priority} />
                    {assignee && <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{assignee.name}</span>}
                  </div>
                </div>
                {deps.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: FF, padding: '3px 10px', borderRadius: 9999, background: COLORS.amberSoft, color: COLORS.amber, whiteSpace: 'nowrap' }}>
                    {deps.filter(d => d.status !== 'done').length > 0 ? `${deps.filter(d => d.status !== 'done').length} blocker${deps.filter(d => d.status !== 'done').length !== 1 ? 's' : ''}` : 'Unblocked'}
                  </span>
                )}
              </div>

              {/* Blocked by section */}
              {deps.length > 0 && (
                <div style={{ marginTop: 12, marginLeft: isMobile ? 0 : 48 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>BLOCKED BY</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {deps.map(d => {
                      const dDone = d.status === 'done';
                      return (
                        <div key={d.id} onClick={() => onOpenTask(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: dDone ? '#F9FAFB' : COLORS.amberSoft, cursor: 'pointer', opacity: dDone ? 0.6 : 1 }}>
                          <ArrowRight size={14} color={dDone ? COLORS.gray : COLORS.amber} style={{ transform: 'rotate(180deg)', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 500, fontFamily: FF, color: dDone ? COLORS.gray : COLORS.ink, flex: 1, textDecoration: dDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                          <StatusPill status={d.status} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Blocking section */}
              {blocking.length > 0 && (
                <div style={{ marginTop: 10, marginLeft: isMobile ? 0 : 48 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>BLOCKING</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {blocking.map(d => (
                      <div key={d.id} onClick={() => onOpenTask(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: COLORS.redSoft, cursor: 'pointer' }}>
                        <ArrowRight size={14} color={COLORS.red} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, fontFamily: FF, color: COLORS.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                        <StatusPill status={d.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {depTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: COLORS.gray, fontFamily: FF }}>
            <Link2 size={32} color={COLORS.line} style={{ display: 'inline-block', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No dependencies found</div>
            <div style={{ fontSize: 13 }}>Link tasks in Sheet or Timeline to create dependency chains.</div>
          </div>
        )}
      </div>
    </div>
  );
}
