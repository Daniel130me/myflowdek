'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { COLORS, PRIORITY_META, type Task, type MemberInfo } from '@/features/flowdeck/model';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, SectionHeader, FF, useProjectMembers } from '../ui';
import { useViewport } from '../../hooks/useViewport';

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

export function ReportsView({ tasks, projectId }: { tasks: Task[]; projectId?: string | null }) {
  const { isMobile } = useViewport();
  // Real project members — used to bucket completion stats per assignee.
  // Falls back to an empty list when no project is selected (the page is
  // rendered at portfolio scope), in which case the per-assignee chart is
  // simply empty.
  const { members } = useProjectMembers(projectId ?? null);
  const memberList: MemberInfo[] = useMemo(() => members, [members]);
  const byPriority = ['urgent', 'high', 'medium', 'low'].map(p => ({ name: PRIORITY_META[p].label, value: tasks.filter(t => t.priority === p).length, color: PRIORITY_META[p].color }));
  const avgProgress = tasks.length ? Math.round(tasks.reduce((a, t) => a + t.progress, 0) / tasks.length) : 0;
  const completionByAssignee = memberList.map(m => {
    const mine = tasks.filter(t => t.assignee === m.id);
    if (!mine.length) return null;
    const done = mine.filter(t => t.status === 'done').length;
    return { name: m.name.split(' ')[0], completion: Math.round((done / mine.length) * 100) };
  }).filter(isDefined);

  /* Story Points / Velocity */
  const tasksWithPoints = useMemo(() => tasks.filter(t => t.storyPoints && t.storyPoints > 0), [tasks]);
  const totalPoints = useMemo(() => tasksWithPoints.reduce((a, t) => a + (t.storyPoints || 0), 0), [tasksWithPoints]);
  const completedPoints = useMemo(() => tasksWithPoints.filter(t => t.status === 'done').reduce((a, t) => a + (t.storyPoints || 0), 0), [tasksWithPoints]);

  // Velocity: points completed per "sprint" (group by 2-week windows based on start date)
  const velocityData = useMemo(() => {
    if (!tasksWithPoints.length) return [];
    const done = tasksWithPoints.filter(t => t.status === 'done');
    if (!done.length) return [];

    // Group by week number
    const weekMap = new Map<string, number>();
    for (const t of done) {
      const d = new Date(t.start);
      const weekNum = Math.floor((d.getTime() - new Date(tasks[0]?.start || d).getTime()) / (14 * 86400000));
      const label = `Sprint ${weekNum + 1}`;
      weekMap.set(label, (weekMap.get(label) || 0) + (t.storyPoints || 0));
    }
    return Array.from(weekMap.entries()).map(([name, points]) => ({ name, points }));
  }, [tasksWithPoints, tasks]);

  // Points by assignee
  const pointsByAssignee = useMemo(() => {
    return memberList.map(m => {
      const mine = tasksWithPoints.filter(t => t.assignee === m.id);
      if (!mine.length) return null;
      const completed = mine.filter(t => t.status === 'done').reduce((a, t) => a + (t.storyPoints || 0), 0);
      const total = mine.reduce((a, t) => a + (t.storyPoints || 0), 0);
      return { name: m.name.split(' ')[0], completed, total, color: m.color ?? COLORS.accent };
    }).filter(isDefined);
  }, [tasksWithPoints, memberList]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div>
      <SectionHeader title="Reports" subtitle="Live figures computed from current project data" />
      {mounted && <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <Card title="Tasks by priority">
          <div style={{ width: '100%', height: isMobile ? 160 : 190 }}>
            <ResponsiveContainer><BarChart data={byPriority}><XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis hide allowDecimals={false} /><Tooltip cursor={{ fill: COLORS.paper }} /><Bar dataKey="value" radius={[5, 5, 0, 0]}>{byPriority.map((p, i) => <Cell key={i} fill={p.color} />)}</Bar></BarChart></ResponsiveContainer>
          </div>
        </Card>
        <Card title="Completion rate by owner">
          <div style={{ width: '100%', height: isMobile ? 160 : 190 }}>
            <ResponsiveContainer><BarChart data={completionByAssignee} layout="vertical" margin={{ left: 4 }}><XAxis type="number" domain={[0, 100]} hide /><YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: COLORS.paper }} formatter={(value) => `${Number(value)}%`} /><Bar dataKey="completion" fill={COLORS.teal} radius={[0, 5, 5, 0]} barSize={14} /></BarChart></ResponsiveContainer>
          </div>
        </Card>
        {velocityData.length > 0 && (
          <Card title="Sprint Velocity (Story Points)">
            <div style={{ width: '100%', height: isMobile ? 160 : 190 }}>
              <ResponsiveContainer><BarChart data={velocityData}><XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis hide allowDecimals={false} /><Tooltip cursor={{ fill: COLORS.paper }} /><Bar dataKey="points" fill={COLORS.purple} radius={[5, 5, 0, 0]} barSize={24} /></BarChart></ResponsiveContainer>
            </div>
          </Card>
        )}
        {pointsByAssignee && pointsByAssignee.length > 0 && (
          <Card title="Points by Team Member">
            <div style={{ width: '100%', height: isMobile ? 160 : 190 }}>
              <ResponsiveContainer><BarChart data={pointsByAssignee} layout="vertical" margin={{ left: 4 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: COLORS.paper }} /><Bar dataKey="total" fill={COLORS.line} radius={[0, 5, 5, 0]} barSize={12} /><Bar dataKey="completed" radius={[0, 5, 5, 0]} barSize={12}>{pointsByAssignee.map((p, i) => <Cell key={i} fill={p.color} />)}</Bar></BarChart></ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginTop: 14 }}>
        <Card title="Average project completion">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 700, fontFamily: FF }}>{avgProgress}%</div>
            <div style={{ flex: 1, height: 10, background: COLORS.line, borderRadius: 5 }}>
              <div style={{ width: `${avgProgress}%`, height: '100%', borderRadius: 5, background: COLORS.accent }} />
            </div>
          </div>
        </Card>
        <Card title="Story Points Progress">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 700, fontFamily: FF, color: COLORS.purple }}>{completedPoints}<span style={{ fontSize: 16, fontWeight: 500, color: COLORS.gray }}>{'/' + totalPoints}</span></div>
            <div style={{ flex: 1, height: 10, background: COLORS.line, borderRadius: 5 }}>
              <div style={{ width: `${totalPoints ? (completedPoints / totalPoints) * 100 : 0}%`, height: '100%', borderRadius: 5, background: COLORS.purple }} />
            </div>
          </div>
          {tasksWithPoints.length === 0 && (
            <div style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, marginTop: 8 }}>Set story points on tasks to track velocity.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
