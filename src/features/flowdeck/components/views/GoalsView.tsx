'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Goal, KeyResult, COLORS, FF, TODAY } from '@/features/flowdeck/model';
import { SectionHeader } from '../ui';
import { Target, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useViewport } from '../../hooks/useViewport';

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  on_track:    { label: 'On Track',    bg: COLORS.greenSoft,  color: COLORS.green  },
  at_risk:     { label: 'At Risk',     bg: COLORS.amberSoft, color: COLORS.amber  },
  off_track:   { label: 'Off Track',   bg: COLORS.redSoft,   color: COLORS.red    },
  not_started: { label: 'Not Started', bg: COLORS.graySoft,  color: COLORS.gray   },
};

const inputStyle: React.CSSProperties = {
  width: '100%', border: `1px solid ${COLORS.line}`, borderRadius: 10,
  padding: '10px 12px', fontSize: 14, background: '#F3F4F6', fontFamily: FF,
  minHeight: 44, boxSizing: 'border-box', outline: 'none',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
  borderRadius: 10, border: 'none', background: COLORS.accent, color: '#fff',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FF, flexShrink: 0,
};

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
  borderRadius: 10, border: `1px solid ${COLORS.line}`, background: COLORS.card, color: COLORS.ink,
  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FF, flexShrink: 0,
};

function goalProgress(goalId: string, keyResults: KeyResult[]): number {
  const krs = keyResults.filter(kr => kr.goalId === goalId);
  if (krs.length === 0) return 0;
  return Math.round(krs.reduce((sum, kr) => {
    if (kr.targetValue === 0) return kr.currentValue === 0 ? 100 : 0;
    return sum + Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100));
  }, 0) / krs.length);
}

function ProgressBar({ pct, color = COLORS.accent, height = 8 }: { pct: number; color?: string; height?: number }) {
  return (
    <div style={{ width: '100%', height, borderRadius: height / 2, background: COLORS.lineLight, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: height / 2, background: color, transition: 'width 0.25s' }} />
    </div>
  );
}

export function GoalsView({ goals, keyResults, onAddGoal, onUpdateGoal, onDeleteGoal, onAddKeyResult, onUpdateKeyResult, onDeleteKeyResult }: {
  goals: Goal[];
  keyResults: KeyResult[];
  onAddGoal: (goal: Goal) => void;
  onUpdateGoal: (id: string, patch: Partial<Goal>) => void;
  onDeleteGoal: (id: string) => void;
  onAddKeyResult: (kr: KeyResult) => void;
  onUpdateKeyResult: (id: string, patch: Partial<KeyResult>) => void;
  onDeleteKeyResult: (id: string) => void;
}) {
  const { isMobile } = useViewport();
  const [showForm, setShowForm] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingKrId, setEditingKrId] = useState<string | null>(null);
  const [editingKrVal, setEditingKrVal] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Add KR form state per goal
  const [addingKr, setAddingKr] = useState<string | null>(null);
  const [newKrTitle, setNewKrTitle] = useState('');
  const [newKrTarget, setNewKrTarget] = useState('');
  const [newKrUnit, setNewKrUnit] = useState('');

  // New goal form
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newStatus, setNewStatus] = useState<Goal['status']>('not_started');

  useEffect(() => {
    if (editingKrId && editInputRef.current) editInputRef.current.focus();
  }, [editingKrId]);

  function handleCreateGoal() {
    if (!newTitle.trim()) return;
    onAddGoal({
      id: `goal-${Date.now()}`,
      title: newTitle.trim(),
      status: newStatus,
      startDate: newStart || TODAY.toISOString().slice(0, 10),
      endDate: newEnd || addMonths(TODAY, 3).toISOString().slice(0, 10),
    });
    setNewTitle(''); setNewStart(''); setNewEnd(''); setNewStatus('not_started');
    setShowForm(false);
  }

  function handleAddKr(goalId: string) {
    if (!newKrTitle.trim() || !newKrTarget) return;
    onAddKeyResult({
      id: `kr-${Date.now()}`,
      goalId,
      title: newKrTitle.trim(),
      targetValue: Number(newKrTarget) || 0,
      currentValue: 0,
      unit: newKrUnit.trim() || 'units',
    });
    setNewKrTitle(''); setNewKrTarget(''); setNewKrUnit('');
    setAddingKr(null);
  }

  function startEditKr(kr: KeyResult) {
    setEditingKrId(kr.id);
    setEditingKrVal(String(kr.currentValue));
  }

  function commitEditKr(krId: string) {
    const v = Number(editingKrVal);
    if (!isNaN(v)) onUpdateKeyResult(krId, { currentValue: v });
    setEditingKrId(null);
  }

  function toggleCollapse(goalId: string) {
    setCollapsed(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div>
      <SectionHeader
        title="Goals & OKRs"
        subtitle={`${goals.length} goal${goals.length !== 1 ? 's' : ''}`}
        right={
          <button onClick={() => setShowForm(f => !f)} style={btnPrimary}>
            <Plus size={16} /> Add Goal
          </button>
        }
      />

      {/* New Goal Form */}
      {showForm && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, fontFamily: FF }}>New Goal</div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr' }}>
            <input style={{ ...inputStyle, gridColumn: isMobile ? 'auto' : '1 / -1' }} placeholder="Goal title" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateGoal()} />
            <input type="date" style={inputStyle} value={newStart} onChange={e => setNewStart(e.target.value)} />
            <input type="date" style={inputStyle} value={newEnd} onChange={e => setNewEnd(e.target.value)} />
            <select style={inputStyle} value={newStatus} onChange={e => setNewStatus(e.target.value as Goal['status'])}>
              {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
            <button onClick={handleCreateGoal} style={btnPrimary}>Create</button>
          </div>
        </div>
      )}

      {/* Goal Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {goals.map(goal => {
          const krs = keyResults.filter(kr => kr.goalId === goal.id);
          const pct = goalProgress(goal.id, keyResults);
          const st = STATUS_STYLES[goal.status] || STATUS_STYLES.not_started;
          const isCollapsed = collapsed[goal.id];

          return (
            <div key={goal.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: isMobile ? 16 : 18 }}>
              {/* Top row: title + delete */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <Target size={18} style={{ color: COLORS.accent, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontWeight: 700, fontSize: 16, fontFamily: FF, letterSpacing: -0.3, lineHeight: 1.3 }}>{goal.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <select
                    value={goal.status}
                    onChange={e => onUpdateGoal(goal.id, { status: e.target.value as Goal['status'] })}
                    style={{ border: 'none', background: 'none', fontSize: 13, fontFamily: FF, cursor: 'pointer', color: st.color, fontWeight: 600, outline: 'none' }}
                  >
                    {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={() => onDeleteGoal(goal.id)} title="Delete goal" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Status badge + date range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: FF, background: st.bg, color: st.color }}>{st.label}</span>
                <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{fmtDate(goal.startDate)} – {fmtDate(goal.endDate)}</span>
              </div>

              {/* Goal-level progress */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.gray }}>Overall Progress</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FF, color: COLORS.ink }}>{pct}%</span>
                </div>
                <ProgressBar pct={pct} color={st.color} height={10} />
              </div>

              {/* Key Results header (collapsible) */}
              <button
                onClick={() => toggleCollapse(goal.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: isCollapsed ? 0 : 10, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FF, fontSize: 13, fontWeight: 600, color: COLORS.ink, padding: 0 }}
              >
                {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                Key Results ({krs.length})
              </button>

              {!isCollapsed && (
                <div>
                  {krs.map(kr => {
                    const krPct = kr.targetValue === 0 ? (kr.currentValue === 0 ? 100 : 0) : Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100));
                    const isEditing = editingKrId === kr.id;
                    return (
                      <div key={kr.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${COLORS.lineLight}` }}>
                        {/* KR title + progress */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: FF, marginBottom: 6, lineHeight: 1.3 }}>{kr.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, maxWidth: isMobile ? 120 : 180 }}>
                              <ProgressBar pct={krPct} color={st.color} height={6} />
                            </div>
                            <span style={{ fontSize: 12, fontFamily: FF, color: COLORS.gray, whiteSpace: 'nowrap' }}>
                              {isEditing ? (
                                <input
                                  ref={editInputRef}
                                  type="number"
                                  value={editingKrVal}
                                  onChange={e => setEditingKrVal(e.target.value)}
                                  onBlur={() => commitEditKr(kr.id)}
                                  onKeyDown={e => { if (e.key === 'Enter') commitEditKr(kr.id); if (e.key === 'Escape') setEditingKrId(null); }}
                                  style={{ width: 56, border: `1px solid ${COLORS.accent}`, borderRadius: 6, padding: '2px 6px', fontSize: 12, fontFamily: FF, outline: 'none', textAlign: 'right' }}
                                />
                              ) : (
                                <span
                                  onClick={() => startEditKr(kr)}
                                  style={{ cursor: 'pointer', borderBottom: `1px dashed ${COLORS.grayLight}`, paddingBottom: 1 }}
                                >
                                  {kr.currentValue}
                                </span>
                              )}
                              {' / '}{kr.targetValue} {kr.unit}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => onDeleteKeyResult(kr.id)} title="Delete key result" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Add Key Result row */}
                  {addingKr === goal.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 10, flexWrap: 'wrap' }}>
                      <input
                        style={{ ...inputStyle, flex: isMobile ? '1 1 100%' : '2 1 0', minHeight: 38, padding: '8px 12px', fontSize: 13 }}
                        placeholder="Key result title"
                        value={newKrTitle}
                        onChange={e => setNewKrTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddKr(goal.id)}
                      />
                      <input
                        type="number"
                        style={{ ...inputStyle, width: isMobile ? '100%' : 80, minHeight: 38, padding: '8px 12px', fontSize: 13 }}
                        placeholder="Target"
                        value={newKrTarget}
                        onChange={e => setNewKrTarget(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddKr(goal.id)}
                      />
                      <input
                        style={{ ...inputStyle, width: isMobile ? '100%' : 80, minHeight: 38, padding: '8px 12px', fontSize: 13 }}
                        placeholder="Unit"
                        value={newKrUnit}
                        onChange={e => setNewKrUnit(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddKr(goal.id)}
                      />
                      <button onClick={() => handleAddKr(goal.id)} style={{ ...btnPrimary, minHeight: 38, padding: '8px 14px', fontSize: 13 }}>Add</button>
                      <button onClick={() => setAddingKr(null)} style={{ ...btnSecondary, minHeight: 38, padding: '8px 14px', fontSize: 13 }}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingKr(goal.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FF, fontSize: 13, color: COLORS.accent, fontWeight: 600, padding: '10px 0', marginTop: 2 }}
                    >
                      <Plus size={14} /> Add Key Result
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {goals.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.gray, fontFamily: FF }}>
            <Target size={40} style={{ margin: '0 auto 12px', color: COLORS.grayLight, display: 'block' }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No goals yet</div>
            <div style={{ fontSize: 13 }}>Add your first goal to start tracking OKRs.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
