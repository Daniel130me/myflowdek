'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { COLORS, STATUS_META, STATUS_ORDER, TEAM, TODAY, dayMs, fmtDate, fmtRange, addDays, teamById, type Task, type Project, type FileItem, type ProjectStatusUpdate } from '@/features/flowdeck/model';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Users, AlertTriangle, CheckCircle2, TrendingUp, Star, Archive, Save, Plus, X, UserPlus, Trash2 } from 'lucide-react';
import { Avatar, StatusPill, PriorityFlag, Card, SectionHeader, StatCard, FileThumbnailGrid, FF } from '../ui';
import { useViewport } from '../../hooks/useViewport';

const STATUS_COLORS: Record<string, string> = { green: '#16A34A', yellow: '#D97706', red: '#DC2626' };
const STATUS_LABELS: Record<string, string> = { green: 'On Track', yellow: 'At Risk', red: 'Off Track' };

export function DashboardView({ project, tasks, files = [], statusUpdates = [], onUpdateProject, onToggleFavorite, onArchive, onSetMembers, onAddStatusUpdate, onDeleteStatusUpdate, onSaveAsTemplate, onOpenTask }: {
  project: Project; tasks: Task[]; files?: FileItem[];
  statusUpdates?: ProjectStatusUpdate[];
  onUpdateProject?: (projectId: string, patch: Partial<Project>) => void;
  onToggleFavorite?: (projectId: string) => void;
  onArchive?: (projectId: string) => void;
  onSetMembers?: (projectId: string, members: string[]) => void;
  onAddStatusUpdate?: (text: string, color: 'green' | 'yellow' | 'red') => void;
  onDeleteStatusUpdate?: (id: string) => void;
  onSaveAsTemplate?: (name: string, includeTasks: boolean) => void;
  onOpenTask: (id: string) => void;
}) {
  const { isMobile } = useViewport();
  const total = tasks.length;
  const byStatus = STATUS_ORDER.map(s => ({ name: STATUS_META[s].label, value: tasks.filter(t => t.status === s).length, color: STATUS_META[s].color }));
  const done = tasks.filter(t => t.status === 'done').length;
  const overallProgress = total ? Math.round(tasks.reduce((a, t) => a + t.progress, 0) / total) : 0;
  const overdue = tasks.filter(t => t.status !== 'done' && addDays(t.start, t.duration) < TODAY);
  const dueSoon = tasks.filter(t => t.status !== 'done').sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, isMobile ? 4 : 5);
  const members = project.members || [];
  const workload = TEAM.filter(m => members.includes(m.id)).map(m => ({ name: m.name.split(' ')[0], tasks: tasks.filter(t => t.assignee === m.id && t.status !== 'done').length })).filter(w => w.tasks > 0);
  const daysLeft = Math.max(0, Math.ceil((new Date(project.end).getTime() - TODAY.getTime()) / dayMs));
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'status'>('overview');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(project.description || '');
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [newStatusText, setNewStatusText] = useState('');
  const [newStatusColor, setNewStatusColor] = useState<'green' | 'yellow' | 'red'>('green');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateIncludeTasks, setTemplateIncludeTasks] = useState(true);
  useEffect(() => { setMounted(true); }, []);

  const filesByTask = useMemo(() => {
    const map: Record<string, FileItem[]> = {};
    for (const f of files) { if (f.linkedTaskId) (map[f.linkedTaskId] ??= []).push(f); }
    return map;
  }, [files]);

  const sortedUpdates = useMemo(() => [...statusUpdates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [statusUpdates]);

  return (
    <div>
      {/* Project header with actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, fontFamily: FF, letterSpacing: -0.5, color: COLORS.ink }}>{project.name} overview</h1>
            {onToggleFavorite && (
              <button onClick={() => onToggleFavorite(project.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                <Star size={20} fill={project.isFavorite ? '#FBBF24' : 'none'} color={project.isFavorite ? '#FBBF24' : COLORS.gray} />
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, color: COLORS.gray, fontFamily: FF }}>{fmtDate(project.start)} – {fmtDate(project.end)} · {daysLeft} days remaining</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {onSaveAsTemplate && (
            <button onClick={() => { setTemplateName(project.name + ' Template'); setShowSaveTemplate(true); }} title='Save as template' style={{ border: 'none', background: COLORS.paper, cursor: 'pointer', color: COLORS.gray, padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: FF, fontWeight: 600 }}>
              <Save size={14} /> Save as template
            </button>
          )}
          {onArchive && (
            <button onClick={() => onArchive(project.id)} title='Archive project' style={{ border: 'none', background: COLORS.paper, cursor: 'pointer', color: COLORS.gray, padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: FF, fontWeight: 600 }}>
              <Archive size={14} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* #36: Project description */}
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        {editingDesc ? (
          <div>
            <textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} onBlur={() => { onUpdateProject?.(project.id, { description: descDraft || undefined }); setEditingDesc(false); }} autoFocus rows={3} style={{ width: '100%', border: `1.5px solid ${COLORS.accent}`, borderRadius: 10, padding: '10px 14px', fontSize: 13.5, fontFamily: FF, lineHeight: 1.5, resize: 'vertical', outline: 'none', background: COLORS.card, boxShadow: '0 0 0 3px rgba(254,128,41,0.1)' }} />
            <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 4 }}>Press Esc or click outside to save</div>
          </div>
        ) : (
          <div onClick={() => { setDescDraft(project.description || ''); setEditingDesc(true); }} style={{ fontSize: 13.5, color: project.description ? COLORS.ink : COLORS.gray, fontFamily: FF, lineHeight: 1.5, cursor: 'pointer', padding: '8px 12px', borderRadius: 10, minHeight: 38, border: `1px dashed ${COLORS.line}`, transition: 'border-color 0.15s' }}>
            {project.description || 'Click to add a project description...'}
          </div>
        )}
      </div>

      {/* #37: Members section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex' }}>
          {members.map((id, i) => {
            const m = teamById[id];
            return (
              <div key={id} style={{ marginLeft: i === 0 ? 0 : -6, border: '2px solid #FFFFFF', borderRadius: '50%', position: 'relative', cursor: 'default' }} title={m?.name || id}>
                <Avatar id={id} size={isMobile ? 28 : 32} />
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: COLORS.gray, fontWeight: 500 }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
        {onSetMembers && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMemberPicker(o => !o)} style={{ border: `1px solid ${COLORS.line}`, background: 'none', cursor: 'pointer', color: COLORS.gray, padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: FF }}>
              <UserPlus size={13} /> Manage
            </button>
            {showMemberPicker && (
              <>
                <div onClick={() => setShowMemberPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', zIndex: 50, padding: 6, minWidth: 220, maxHeight: 300, overflowY: 'auto' }}>
                  {TEAM.map(m => {
                    const isMember = members.includes(m.id);
                    return (
                      <button key={m.id} onClick={() => {
                        const next = isMember ? members.filter(x => x !== m.id) : [...members, m.id];
                        onSetMembers(project.id, next);
                      }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', background: isMember ? COLORS.accentSoft : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 13, fontFamily: FF, color: COLORS.ink }}>
                        <div style={{ border: '2px solid #FFFFFF', borderRadius: '50%' }}><Avatar id={m.id} size={22} /></div>
                        <span style={{ flex: 1 }}>{m.name}</span>
                        <span style={{ fontSize: 11, color: COLORS.gray }}>{m.role}</span>
                        {isMember && <span style={{ color: COLORS.accent, fontWeight: 700 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tab bar: Overview / Status */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${COLORS.line}`, marginBottom: 16 }}>
        {(['overview', 'status'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FF, color: activeTab === tab ? COLORS.ink : COLORS.gray, borderBottom: activeTab === tab ? `2px solid ${COLORS.ink}` : '2px solid transparent', marginBottom: -2, textTransform: 'capitalize' }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 14, marginBottom: isMobile ? 14 : 20 }}>
            <StatCard label='Progress' value={`${overallProgress}%`} icon={TrendingUp} color={COLORS.accent} />
            <StatCard label='Done' value={`${done}/${total}`} icon={CheckCircle2} color={COLORS.green} />
            <StatCard label='Overdue' value={overdue.length} icon={AlertTriangle} color={overdue.length ? COLORS.red : COLORS.gray} />
            <StatCard label='Team' value={String(members.length)} icon={Users} color={COLORS.teal} />
          </div>
          {mounted && <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr', gap: 14 }}>
            <Card title='Status breakdown'>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20 }}>
                <div style={{ width: isMobile ? 120 : 150, height: isMobile ? 120 : 150 }}>
                  <ResponsiveContainer><PieChart><Pie data={byStatus} dataKey='value' innerRadius={isMobile ? 34 : 44} outerRadius={isMobile ? 54 : 68} paddingAngle={3}>{byStatus.map((s, i) => <Cell key={i} fill={s.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byStatus.map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: isMobile ? 12 : 13 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />
                      {s.name} <span style={{ color: COLORS.gray }}>({s.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card title='Active workload'>
              {workload.length > 0 ? (
                <div style={{ width: '100%', height: isMobile ? 140 : 170 }}>
                  <ResponsiveContainer><BarChart data={workload} layout='vertical' margin={{ left: 4, right: 12 }}><XAxis type='number' hide allowDecimals={false} /><YAxis type='category' dataKey='name' width={64} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: COLORS.paper }} /><Bar dataKey='tasks' fill={COLORS.accent} radius={[0, 5, 5, 0]} barSize={14} /></BarChart></ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: COLORS.gray, fontSize: 13, padding: '30px 0' }}>No active tasks assigned</div>
              )}
            </Card>
          </div>}
          <Card title='Coming up' style={{ marginTop: 14 }}>
            <div>
              {dueSoon.map(t => {
                const tFiles = filesByTask[t.id] || [];
                return (
                  <div key={t.id} onClick={() => onOpenTask(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: `1px solid ${COLORS.line}`, cursor: 'pointer', minHeight: 52 }}>
                    <Avatar id={t.assignee} size={isMobile ? 28 : 26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: isMobile ? 13.5 : 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: isMobile ? 11 : 12, color: COLORS.gray }}>{fmtRange(t.start, t.duration)}</span>
                        {tFiles.length > 0 && <FileThumbnailGrid files={tFiles} max={2} />}
                      </div>
                    </div>
                    <PriorityFlag priority={t.priority} />
                    <StatusPill status={t.status} />
                  </div>
                );
              })}
              {dueSoon.length === 0 && <div style={{ textAlign: 'center', color: COLORS.gray, fontSize: 13, padding: 20 }}>No upcoming tasks</div>}
            </div>
          </Card>
        </>
      ) : (
        /* #40: Status Updates tab */
        <>
          {/* New status update form */}
          {onAddStatusUpdate && (
            <Card style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {(['green', 'yellow', 'red'] as const).map(c => (
                  <button key={c} onClick={() => setNewStatusColor(c)} style={{ padding: '6px 14px', borderRadius: 9999, border: `2px solid ${newStatusColor === c ? STATUS_COLORS[c] : COLORS.line}`, background: newStatusColor === c ? `${STATUS_COLORS[c]}18` : 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: FF, color: newStatusColor === c ? STATUS_COLORS[c] : COLORS.gray, transition: 'all 0.15s' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[c], marginRight: 4 }} />
                    {STATUS_LABELS[c]}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea value={newStatusText} onChange={e => setNewStatusText(e.target.value)} placeholder='Share a project status update...' rows={2} style={{ flex: 1, border: `1.5px solid ${COLORS.line}`, borderRadius: 10, padding: '10px 14px', fontSize: 13.5, fontFamily: FF, resize: 'none', outline: 'none', background: COLORS.card }} />
                <button onClick={() => { if (newStatusText.trim()) { onAddStatusUpdate(newStatusText.trim(), newStatusColor); setNewStatusText(''); } }} disabled={!newStatusText.trim()} style={{ alignSelf: 'flex-end', border: 'none', background: newStatusText.trim() ? COLORS.ink : COLORS.line, color: '#FFFFFF', cursor: newStatusText.trim() ? 'pointer' : 'not-allowed', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: FF, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={15} /> Post
                </button>
              </div>
            </Card>
          )}
          {/* Status history timeline */}
          {sortedUpdates.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {sortedUpdates.map(su => {
                const author = teamById[su.authorId];
                return (
                  <div key={su.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: `1px solid ${COLORS.line}`, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: `${STATUS_COLORS[su.color]}22` }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${STATUS_COLORS[su.color]}`, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[su.color] }} />
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Avatar id={su.authorId} size={22} />
                        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FF }}>{author?.name || 'Unknown'}</span>
                        <span style={{ fontSize: 11, color: COLORS.gray }}>{new Date(su.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: STATUS_COLORS[su.color], background: `${STATUS_COLORS[su.color]}18`, padding: '2px 8px', borderRadius: 9999, fontFamily: FF }}>{STATUS_LABELS[su.color]}</span>
                        {onDeleteStatusUpdate && (
                          <button onClick={() => onDeleteStatusUpdate(su.id)} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 2, display: 'flex' }}><Trash2 size={14} /></button>
                        )}
                      </div>
                      <div style={{ fontSize: 13.5, color: COLORS.ink, lineHeight: 1.5, fontFamily: FF }}>{su.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: COLORS.gray, fontSize: 13, padding: '40px 0' }}>No status updates yet. Post the first one above.</div>
          )}
        </>
      )}

      {/* #41: Save as Template modal */}
      {showSaveTemplate && onSaveAsTemplate && (
        <>
          <div onClick={() => setShowSaveTemplate(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 49 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#FFFFFF', borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', zIndex: 50, padding: 24, width: 'min(420px, 90vw)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: FF }}>Save as Template</h3>
              <button onClick={() => setShowSaveTemplate(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 4, display: 'block', fontFamily: FF }}>Template name</label>
              <input value={templateName} onChange={e => setTemplateName(e.target.value)} style={{ width: '100%', border: `1.5px solid ${COLORS.line}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: FF, outline: 'none' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontFamily: FF, marginBottom: 16 }}>
              <input type='checkbox' checked={templateIncludeTasks} onChange={e => setTemplateIncludeTasks(e.target.checked)} style={{ width: 16, height: 16, accentColor: COLORS.accent }} />
              Include task structure
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSaveTemplate(false)} style={{ border: `1px solid ${COLORS.line}`, background: 'none', cursor: 'pointer', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: FF, color: COLORS.gray }}>Cancel</button>
              <button onClick={() => { if (templateName.trim()) { onSaveAsTemplate(templateName.trim(), templateIncludeTasks); setShowSaveTemplate(false); } }} disabled={!templateName.trim()} style={{ border: 'none', background: templateName.trim() ? COLORS.accent : COLORS.line, color: '#FFFFFF', cursor: templateName.trim() ? 'pointer' : 'not-allowed', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: FF }}>Save Template</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
