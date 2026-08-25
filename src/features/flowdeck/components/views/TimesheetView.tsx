'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  COLORS, FF, TODAY, TEAM, teamById, CURRENT_USER_ID, MEMBER_CAPACITY,
  type TimesheetEntry, type Task, type Project,
} from '@/features/flowdeck/model';
import { SectionHeader, Avatar } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Clock, BarChart3, AlertTriangle,
  Send, X, StickyNote, CheckCircle, ClipboardList,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types & Props                                                              */
/* -------------------------------------------------------------------------- */

interface TimesheetViewProps {
  timesheets: TimesheetEntry[];
  tasks: Task[];
  projects: Record<string, Project>;
  currentProjectId: string | null;
  currentUserId: string;
  onAddEntry: (entry: TimesheetEntry) => void;
  onUpdateEntry: (id: string, patch: Partial<TimesheetEntry>) => void;
  onDeleteEntry: (id: string) => void;
  /**
   * Submit a batch of entries for approval (POST /api/timesheets/submit).
   * If omitted, the view falls back to marking each entry as submitted via
   * `onUpdateEntry` (legacy behaviour — not persisted through the dedicated
   * submit endpoint).
   */
  onSubmit?: (entryIds: string[]) => void | Promise<void>;
  /**
   * Approve a batch of submitted entries (POST /api/timesheets/approve).
   * Only project OWNER/ADMIN can call this successfully (the server enforces
   * the APPROVE_TIMESHEETS capability). If omitted, the Approve button is
   * not rendered.
   */
  onApprove?: (entryIds: string[]) => void | Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

function fmtDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtWeekRange(days: Date[]): string {
  const start = days[0];
  const end = days[6];
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = start.toLocaleDateString('en-US', opts);
  const e = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} \u2013 ${e}`;
}

function isToday(d: Date): boolean {
  return (
    d.getFullYear() === TODAY.getFullYear() &&
    d.getMonth() === TODAY.getMonth() &&
    d.getDate() === TODAY.getDate()
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function TimesheetView({
  timesheets, tasks, projects, currentProjectId, currentUserId,
  onAddEntry, onUpdateEntry, onDeleteEntry, onSubmit, onApprove,
}: TimesheetViewProps) {
  const { isMobile } = useViewport();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [notePopover, setNotePopover] = useState<{ taskId: string; dateKey: string; entryId: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const noteInputRef = useRef<HTMLInputElement | null>(null);

  /* Week days */
  const weekDays = useMemo(() => {
    const base = new Date(TODAY);
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDays(base);
  }, [weekOffset]);

  const weekKeys = useMemo(() => weekDays.map(fmtDateKey), [weekDays]);

  /* Tasks assigned to selected user in current project (top-level only) */
  const userTasks = useMemo(() => {
    return tasks.filter(t => t.assignee === selectedUserId && !t.parentId);
  }, [tasks, selectedUserId]);

  /* Build lookup: taskId+dateKey → TimesheetEntry */
  const entryMap = useMemo(() => {
    const map = new Map<string, TimesheetEntry>();
    for (const e of timesheets) {
      if (e.userId === selectedUserId && weekKeys.includes(e.date)) {
        map.set(`${e.taskId}::${e.date}`, e);
      }
    }
    return map;
  }, [timesheets, selectedUserId, weekKeys]);

  /* Week entries for submit */
  const weekEntries = useMemo(() => {
    return timesheets.filter(
      e => e.userId === selectedUserId && weekKeys.includes(e.date)
    );
  }, [timesheets, selectedUserId, weekKeys]);

  /* Summary stats */
  const totalHours = useMemo(() => {
    return weekEntries.reduce((sum, e) => sum + e.hours, 0);
  }, [weekEntries]);

  const capacity = MEMBER_CAPACITY[selectedUserId] || 40;
  const utilization = capacity > 0 ? Math.round((totalHours / capacity) * 100) : 0;
  const isOvertime = totalHours > capacity;

  /* Daily totals */
  const dailyTotals = useMemo(() => {
    return weekKeys.map(dateKey =>
      weekEntries.filter(e => e.date === dateKey).reduce((sum, e) => sum + e.hours, 0)
    );
  }, [weekEntries, weekKeys]);

  /* Week navigation */
  const goPrev = useCallback(() => setWeekOffset(w => w - 1), []);
  const goNext = useCallback(() => setWeekOffset(w => w + 1), []);
  const goToday = useCallback(() => setWeekOffset(0), []);

  /* Handle hour input */
  const handleHourChange = useCallback((taskId: string, dateKey: string, value: string) => {
    const numVal = value === '' ? 0 : parseFloat(value);
    if (isNaN(numVal) || numVal < 0 || numVal > 24) return;

    const key = `${taskId}::${dateKey}`;
    const existing = entryMap.get(key);

    if (existing) {
      if (numVal === 0) {
        onDeleteEntry(existing.id);
      } else {
        onUpdateEntry(existing.id, { hours: numVal });
      }
    } else if (numVal > 0) {
      const entry: TimesheetEntry = {
        id: 'ts_' + Math.random().toString(36).slice(2, 8),
        userId: selectedUserId,
        projectId: currentProjectId || '',
        taskId,
        date: dateKey,
        hours: numVal,
        note: '',
        submitted: false,
        approved: false,
        createdAt: new Date().toISOString(),
      };
      onAddEntry(entry);
    }
  }, [entryMap, selectedUserId, currentProjectId, onAddEntry, onUpdateEntry, onDeleteEntry]);

  /* Note popover */
  const openNotePopover = useCallback((taskId: string, dateKey: string) => {
    const key = `${taskId}::${dateKey}`;
    const entry = entryMap.get(key);
    if (!entry) return;
    setNotePopover({ taskId, dateKey, entryId: entry.id });
    setNoteDraft(entry.note || '');
    setTimeout(() => noteInputRef.current?.focus(), 50);
  }, [entryMap]);

  const saveNote = useCallback(() => {
    if (!notePopover) return;
    onUpdateEntry(notePopover.entryId, { note: noteDraft });
    setNotePopover(null);
    setNoteDraft('');
  }, [notePopover, noteDraft, onUpdateEntry]);

  /* Submit for approval — uses the dedicated /api/timesheets/submit endpoint
   * when `onSubmit` is provided (the canonical path). Falls back to the
   * legacy "mark each entry submitted via onUpdateEntry" behaviour when the
   * caller hasn't wired the dedicated submit handler. */
  const handleSubmit = useCallback(async () => {
    const unsubmitted = weekEntries.filter(e => !e.submitted);
    if (unsubmitted.length === 0) {
      toast.info('All entries already submitted');
      return;
    }
    if (onSubmit) {
      try {
        await onSubmit(unsubmitted.map(e => e.id));
        toast.success(`${unsubmitted.length} time ${unsubmitted.length === 1 ? 'entry' : 'entries'} submitted for approval`);
      } catch {
        toast.error('Failed to submit entries for approval');
      }
      return;
    }
    for (const e of unsubmitted) {
      onUpdateEntry(e.id, { submitted: true });
    }
    toast.success(`${unsubmitted.length} time ${unsubmitted.length === 1 ? 'entry' : 'entries'} submitted for approval`);
  }, [weekEntries, onUpdateEntry, onSubmit]);

  /* Approve submitted entries — uses the dedicated /api/timesheets/approve
   * endpoint when `onApprove` is provided. */
  const handleApprove = useCallback(async () => {
    const submittedNotApproved = weekEntries.filter(e => e.submitted && !e.approved);
    if (submittedNotApproved.length === 0) {
      toast.info('No entries pending approval');
      return;
    }
    if (!onApprove) return;
    try {
      await onApprove(submittedNotApproved.map(e => e.id));
      toast.success(`${submittedNotApproved.length} entr${submittedNotApproved.length === 1 ? 'y' : 'ies'} approved`);
    } catch {
      toast.error('Failed to approve entries');
    }
  }, [weekEntries, onApprove]);

  /* Get hours for a cell */
  const getCellHours = (taskId: string, dateKey: string): number => {
    return entryMap.get(`${taskId}::${dateKey}`)?.hours || 0;
  };

  /* Get row total */
  const getRowTotal = (taskId: string): number => {
    return weekKeys.reduce((sum, dk) => sum + getCellHours(taskId, dk), 0);
  };

  /* Get note for a cell */
  const getCellNote = (taskId: string, dateKey: string): string => {
    return entryMap.get(`${taskId}::${dateKey}`)?.note || '';
  };

  /* Check if cell has a note */
  const hasNote = (taskId: string, dateKey: string): boolean => {
    return !!getCellNote(taskId, dateKey);
  };

  /* All submitted? */
  const allSubmitted = weekEntries.length > 0 && weekEntries.every(e => e.submitted);

  /* Close note popover on outside click */
  useEffect(() => {
    if (!notePopover) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-note-popover]')) return;
      saveNote();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notePopover, saveNote]);

  /* ---- Render ---- */
  const member = teamById[selectedUserId];
  const projectName = currentProjectId ? projects[currentProjectId]?.name : '';

  const summaryBar = (
    <div style={{
      display: 'flex', gap: isMobile ? 8 : 14, flexWrap: 'wrap', marginBottom: isMobile ? 14 : 18,
    }}>
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12,
        padding: isMobile ? '10px 14px' : '14px 18px', flex: 1, minWidth: 120,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Clock size={isMobile ? 13 : 15} color={COLORS.accent} />
          <span style={{ fontSize: isMobile ? 10.5 : 11.5, fontWeight: 600, color: COLORS.gray, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 0.6 }}>Total Hours</span>
        </div>
        <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, fontFamily: FF }}>{totalHours}h</div>
      </div>
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12,
        padding: isMobile ? '10px 14px' : '14px 18px', flex: 1, minWidth: 120,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <BarChart3 size={isMobile ? 13 : 15} color={COLORS.teal} />
          <span style={{ fontSize: isMobile ? 10.5 : 11.5, fontWeight: 600, color: COLORS.gray, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 0.6 }}>Capacity</span>
        </div>
        <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, fontFamily: FF }}>{capacity}h</div>
      </div>
      <div style={{
        background: isOvertime ? COLORS.redSoft : COLORS.greenSoft, border: `1px solid ${isOvertime ? '#FECACA' : '#BBF7D0'}`, borderRadius: 12,
        padding: isMobile ? '10px 14px' : '14px 18px', flex: 1, minWidth: 120,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {isOvertime ? <AlertTriangle size={isMobile ? 13 : 15} color={COLORS.red} /> : <CheckCircle size={isMobile ? 13 : 15} color={COLORS.green} />}
          <span style={{ fontSize: isMobile ? 10.5 : 11.5, fontWeight: 600, color: isOvertime ? COLORS.red : COLORS.green, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 0.6 }}>Utilization</span>
        </div>
        <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, fontFamily: FF, color: isOvertime ? COLORS.red : COLORS.green }}>
          {utilization}%
          {isOvertime && <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, marginLeft: 6 }}>OVERTIME</span>}
        </div>
      </div>
    </div>
  );

  const weekNav = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, marginBottom: isMobile ? 10 : 14,
    }}>
      <button onClick={goPrev} style={btnStyle} title="Previous week">
        <ChevronLeft size={isMobile ? 16 : 18} />
      </button>
      <div style={{
        fontSize: isMobile ? 13 : 14, fontWeight: 600, fontFamily: FF, color: COLORS.ink,
        minWidth: isMobile ? 140 : 200, textAlign: 'center',
      }}>
        {fmtWeekRange(weekDays)}
      </div>
      <button onClick={goNext} style={btnStyle} title="Next week">
        <ChevronRight size={isMobile ? 16 : 18} />
      </button>
      <button onClick={goToday} style={{
        ...btnStyle,
        background: COLORS.accentSoft, color: COLORS.accent, fontSize: isMobile ? 11 : 12,
        fontWeight: 600, padding: isMobile ? '4px 10px' : '5px 14px', borderRadius: 8,
      }}>
        Today
      </button>
    </div>
  );

  const memberSelector = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, marginBottom: isMobile ? 10 : 14,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, fontFamily: FF, marginRight: 2 }}>Member:</span>
      {TEAM.map(m => (
        <button
          key={m.id}
          onClick={() => setSelectedUserId(m.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: selectedUserId === m.id ? m.color + '18' : COLORS.graySoft,
            color: selectedUserId === m.id ? m.color : COLORS.gray,
            fontFamily: FF, fontSize: isMobile ? 11 : 12, fontWeight: 600,
            transition: 'all 0.15s',
          }}
        >
          <Avatar id={m.id} size={18} />
          {m.name.split(' ')[0]}
        </button>
      ))}
    </div>
  );

  /* Empty state */
  if (userTasks.length === 0) {
    return (
      <div>
        <SectionHeader title="Timesheet" subtitle={`${member?.name || 'Team member'} \u2022 ${projectName}`} />
        {weekNav}
        {memberSelector}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px', background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.line}`,
        }}>
          <ClipboardList size={48} color={COLORS.grayLight} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 15, fontWeight: 600, fontFamily: FF, color: COLORS.ink, marginBottom: 6 }}>
            No assigned tasks
          </div>
          <div style={{ fontSize: 13, fontFamily: FF, color: COLORS.gray, textAlign: 'center' }}>
            {member?.name} has no tasks assigned in this project. Assign tasks to see the timesheet grid.
          </div>
        </div>
      </div>
    );
  }

  /* ---- Desktop Table ---- */
  const headerCellStyle: React.CSSProperties = {
    fontSize: isMobile ? 10 : 11.5,
    fontWeight: 700,
    color: COLORS.gray,
    fontFamily: FF,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    padding: isMobile ? '8px 4px' : '10px 8px',
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
  };

  const cellInputStyle = (focused: boolean): React.CSSProperties => ({
    width: isMobile ? 40 : 52,
    height: isMobile ? 28 : 32,
    border: focused ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
    borderRadius: 6,
    textAlign: 'center' as const,
    fontSize: isMobile ? 12 : 13,
    fontFamily: FF,
    fontWeight: 600,
    color: COLORS.ink,
    background: focused ? COLORS.accentSoft : COLORS.card,
    outline: 'none',
    padding: 0,
    transition: 'border-color 0.15s, background 0.15s',
  });

  const desktopTable = (
    <div style={{
      background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.line}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: FF, minWidth: 680 }}>
          <thead>
            <tr style={{ background: COLORS.graySoft }}>
              <th style={{ ...headerCellStyle, textAlign: 'left', paddingLeft: isMobile ? 12 : 16, width: isMobile ? 120 : 220 }}>Task</th>
              {weekDays.map((d, i) => (
                <th key={i} style={{
                  ...headerCellStyle,
                  color: isToday(d) ? COLORS.accent : COLORS.gray,
                  position: 'relative',
                }}>
                  {DAY_LABELS[i]} {d.getDate()}
                  {isToday(d) && (
                    <span style={{
                      position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%', background: COLORS.accent,
                    }} />
                  )}
                </th>
              ))}
              <th style={{ ...headerCellStyle, color: COLORS.ink, fontWeight: 800 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {userTasks.map((task, rowIdx) => {
              const rowTotal = getRowTotal(task.id);
              return (
                <tr key={task.id} style={{
                  borderBottom: rowIdx < userTasks.length - 1 ? `1px solid ${COLORS.lineLight}` : 'none',
                }}>
                  <td style={{
                    padding: isMobile ? '6px 12px' : '8px 16px', fontSize: isMobile ? 12 : 13,
                    fontWeight: 500, color: COLORS.ink, fontFamily: FF, maxWidth: isMobile ? 120 : 220,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={task.name}>
                    {task.name}
                  </td>
                  {weekDays.map((d, colIdx) => {
                    const dk = weekKeys[colIdx];
                    const hours = getCellHours(task.id, dk);
                    const note = hasNote(task.id, dk);
                    const cellKey = `${task.id}::${colIdx}`;
                    return (
                      <td key={colIdx} style={{
                        padding: isMobile ? '4px 2px' : '6px 4px', textAlign: 'center',
                        position: 'relative',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          <input
                            ref={el => { inputRefs.current[cellKey] = el; }}
                            type="number"
                            min={0}
                            max={24}
                            step={0.5}
                            value={hours || ''}
                            placeholder="\u2014"
                            onChange={e => handleHourChange(task.id, dk, e.target.value)}
                            onFocus={ev => { setFocusedCell(cellKey); ev.target.select(); }}
                            onBlur={() => setFocusedCell(null)}
                            style={cellInputStyle(focusedCell === cellKey)}
                          />
                          {note && (
                            <button
                              onClick={() => openNotePopover(task.id, dk)}
                              title={getCellNote(task.id, dk)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: 0, display: 'flex', alignItems: 'center',
                              }}
                            >
                              <StickyNote size={12} color={COLORS.amber} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{
                    padding: isMobile ? '6px 8px' : '8px 12px', textAlign: 'center',
                    fontSize: isMobile ? 12 : 13, fontWeight: 700, fontFamily: FF,
                    color: rowTotal > 0 ? COLORS.ink : COLORS.grayLight,
                  }}>
                    {rowTotal || '\u2014'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: COLORS.graySoft, borderTop: `2px solid ${COLORS.line}` }}>
              <td style={{
                ...headerCellStyle, textAlign: 'left', paddingLeft: isMobile ? 12 : 16,
                fontWeight: 800, color: COLORS.ink, fontSize: isMobile ? 11 : 12,
              }}>
                Daily Totals
              </td>
              {dailyTotals.map((total, i) => (
                <td key={i} style={{
                  ...headerCellStyle, fontWeight: 800, color: total > 0 ? COLORS.ink : COLORS.grayLight,
                  fontSize: isMobile ? 11 : 12,
                }}>
                  {total || '\u2014'}
                </td>
              ))}
              <td style={{
                ...headerCellStyle, fontWeight: 800, color: COLORS.accent,
                fontSize: isMobile ? 11 : 12,
              }}>
                {totalHours || '\u2014'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  /* ---- Mobile Card List ---- */
  const mobileCards = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {userTasks.map(task => {
        const rowTotal = getRowTotal(task.id);
        return (
          <div key={task.id} style={{
            background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.line}`,
            padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              fontSize: 13, fontWeight: 600, fontFamily: FF, color: COLORS.ink,
              marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={task.name}>
              {task.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {weekDays.map((d, i) => {
                const dk = weekKeys[i];
                const hours = getCellHours(task.id, dk);
                const note = hasNote(task.id, dk);
                const isTodayCol = isToday(d);
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px', borderRadius: 8,
                    background: isTodayCol ? COLORS.accentSoft : COLORS.graySoft,
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: isTodayCol ? 700 : 500, fontFamily: FF,
                      color: isTodayCol ? COLORS.accent : COLORS.gray,
                    }}>
                      {DAY_LABELS[i]} {d.getDate()}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {note && (
                        <button
                          onClick={() => openNotePopover(task.id, dk)}
                          title={getCellNote(task.id, dk)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                          <StickyNote size={13} color={COLORS.amber} />
                        </button>
                      )}
                      <input
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        value={hours || ''}
                        placeholder="\u2014"
                        onChange={e => handleHourChange(task.id, dk, e.target.value)}
                        onFocus={e => e.target.select()}
                        style={{
                          width: 48, height: 28, border: `1px solid ${COLORS.line}`,
                          borderRadius: 6, textAlign: 'center', fontSize: 12, fontFamily: FF,
                          fontWeight: 600, color: COLORS.ink, background: COLORS.card, outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{
              marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.lineLight}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.gray, fontFamily: FF }}>Total</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink, fontFamily: FF }}>{rowTotal}h</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ---- Submit button ---- */
  const submitBtn = weekEntries.length > 0 ? (
    <button
      onClick={handleSubmit}
      disabled={allSubmitted}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: isMobile ? '8px 14px' : '9px 18px',
        borderRadius: 10, border: 'none', cursor: allSubmitted ? 'default' : 'pointer',
        background: allSubmitted ? COLORS.greenSoft : COLORS.accent,
        color: allSubmitted ? COLORS.green : '#FFFFFF',
        fontFamily: FF, fontSize: isMobile ? 12 : 13, fontWeight: 600,
        opacity: allSubmitted ? 0.8 : 1,
        transition: 'all 0.15s',
        boxShadow: allSubmitted ? 'none' : '0 2px 8px rgba(254,128,41,0.25)',
      }}
    >
      {allSubmitted ? (
        <><CheckCircle size={isMobile ? 14 : 16} /> Submitted</>
      ) : (
        <><Send size={isMobile ? 14 : 16} /> Submit for Approval</>
      )}
    </button>
  ) : null;

  /* ---- Approve button (managers only — server enforces capability) ----
   * Renders when the caller wires `onApprove` AND there are submitted-but-
   * not-yet-approved entries in the current week. */
  const hasSubmittedNotApproved = weekEntries.some(e => e.submitted && !e.approved);
  const approveBtn = (onApprove && hasSubmittedNotApproved) ? (
    <button
      onClick={handleApprove}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: isMobile ? '8px 14px' : '9px 18px',
        borderRadius: 10, border: 'none', cursor: 'pointer',
        background: COLORS.green,
        color: '#FFFFFF',
        fontFamily: FF, fontSize: isMobile ? 12 : 13, fontWeight: 600,
        transition: 'all 0.15s',
        boxShadow: '0 2px 8px rgba(22,163,74,0.25)',
      }}
    >
      <CheckCircle size={isMobile ? 14 : 16} /> Approve
    </button>
  ) : null;

  const headerActions = (
    <div style={{ display: 'flex', gap: 8 }}>
      {approveBtn}
      {submitBtn}
    </div>
  );

  /* ---- Note Popover ---- */
  const notePopoverEl = notePopover ? (
    <div
      data-note-popover
      style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.line}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: 20, width: 320, zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FF, color: COLORS.ink }}>Add Note</span>
        <button
          onClick={() => setNotePopover(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: COLORS.gray }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, marginBottom: 10 }}>
        {notePopover.dateKey} \u2022 {tasks.find(t => t.id === notePopover.taskId)?.name}
      </div>
      <input
        ref={noteInputRef}
        value={noteDraft}
        onChange={e => setNoteDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') saveNote(); if (e.key === 'Escape') setNotePopover(null); }}
        placeholder="What did you work on?"
        style={{
          width: '100%', padding: '8px 12px', border: `1px solid ${COLORS.line}`,
          borderRadius: 8, fontSize: 13, fontFamily: FF, color: COLORS.ink,
          outline: 'none', background: COLORS.graySoft,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button
          onClick={() => setNotePopover(null)}
          style={{
            padding: '6px 14px', borderRadius: 8, border: `1px solid ${COLORS.line}`,
            background: COLORS.card, cursor: 'pointer', fontSize: 12, fontFamily: FF,
            fontWeight: 600, color: COLORS.gray,
          }}
        >
          Cancel
        </button>
        <button
          onClick={saveNote}
          style={{
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: COLORS.accent, cursor: 'pointer', fontSize: 12, fontFamily: FF,
            fontWeight: 600, color: '#FFFFFF',
          }}
        >
          Save
        </button>
      </div>
    </div>
  ) : null;

  const backdrop = notePopover ? (
    <div
      onClick={() => setNotePopover(null)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 99,
      }}
    />
  ) : null;

  return (
    <div>
      <SectionHeader
        title="Timesheet"
        subtitle={`${member?.name || 'Team member'} \u2022 ${projectName}`}
        right={headerActions}
      />
      {weekNav}
      {memberSelector}
      {summaryBar}
      {isMobile ? mobileCards : desktopTable}
      {backdrop}
      {notePopoverEl}
    </div>
  );
}

/* ---- Shared button style ---- */
const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '6px 8px', borderRadius: 8, border: `1px solid ${COLORS.line}`,
  background: COLORS.card, cursor: 'pointer', color: COLORS.ink,
  transition: 'all 0.15s',
};
