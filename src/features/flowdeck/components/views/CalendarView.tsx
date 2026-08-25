'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { COLORS, STATUS_META, TODAY, addDays, FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { SectionHeader } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import type { Task } from '@/features/flowdeck/model';

const iconBtnStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 10, border: `1px solid ${COLORS.line}`, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: FF, flexShrink: 0 };

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_START = 6;
const HOUR_END = 21; // 9pm (exclusive), so 6am-9pm = 16 hours
const CELL_HEIGHT = 48;

function getHourFromDate(dateStr: string): number {
  const d = new Date(dateStr);
  const h = d.getHours();
  return h < HOUR_START ? HOUR_START : h >= HOUR_END ? HOUR_END - 1 : h;
}

function getDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekStart(cursor: Date): Date {
  const d = new Date(cursor);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function CalendarView({ tasks, onOpenTask, onQuickAdd, onUpdateTaskDueDate }: { tasks: Task[]; onOpenTask: (id: string) => void; onQuickAdd?: (name: string, start: string) => void; onUpdateTaskDueDate?: (taskId: string, newDate: string) => void }) {
  const { isMobile } = useViewport();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [cursor, setCursor] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [addingOnDate, setAddingOnDate] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [dragTask, setDragTask] = useState<{ id: string; name: string; status: string } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ taskId: string; mouseX: number; mouseY: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (addingOnDate && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingOnDate]);

  // Global mousemove and mouseup for drag
  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    // Only start visual drag after 4px movement
    if (!dragTask && (Math.abs(dx) < 4 && Math.abs(dy) < 4)) return;
    if (dragTask) {
      setDragPos({ x: e.clientX, y: e.clientY });
    } else if (dragStartRef.current) {
      const t = tasks.find(tk => tk.id === dragStartRef.current!.taskId);
      if (t) {
        setDragTask({ id: t.id, name: t.name, status: t.status });
        setDragPos({ x: e.clientX, y: e.clientY });
      }
    }
  }, [dragTask, tasks]);

  const handleMouseUp = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!dragStartRef.current) {
      setDragTask(null);
      setDragPos(null);
      dragStartRef.current = null;
      setIsDragging(false);
      return;
    }
    if (dragTask && dragPos && gridRef.current && onUpdateTaskDueDate) {
      const rect = gridRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      if (viewMode === 'week') {
        // Determine column (day) from x position
        const colWidth = rect.width / 7;
        const colIndex = Math.max(0, Math.min(6, Math.floor(relX / colWidth)));
        const weekStart = getWeekStart(cursor);
        const targetDay = addDays(getDateStr(weekStart), colIndex);
        const newY = relY - 36; // subtract header height
        const hourIndex = Math.max(0, Math.min(15, Math.floor(newY / CELL_HEIGHT)));
        const newHour = HOUR_START + hourIndex;
        const newDate = new Date(targetDay);
        newDate.setHours(newHour, 0, 0, 0);
        onUpdateTaskDueDate(dragTask.id, newDate.toISOString());
      } else if (viewMode === 'day') {
        // Same day, different time
        const newY = relY - 36;
        const hourIndex = Math.max(0, Math.min(15, Math.floor(newY / CELL_HEIGHT)));
        const newHour = HOUR_START + hourIndex;
        const newDate = new Date(cursor);
        newDate.setHours(newHour, 0, 0, 0);
        onUpdateTaskDueDate(dragTask.id, newDate.toISOString());
      }
    }
    setDragTask(null);
    setDragPos(null);
    dragStartRef.current = null;
    setIsDragging(false);
  }, [dragTask, dragPos, viewMode, cursor, onUpdateTaskDueDate]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleMouseMove(e);
    const onUp = (e: MouseEvent) => handleMouseUp(e);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  function handlePillMouseDown(e: React.MouseEvent, task: Task) {
    e.stopPropagation();
    dragStartRef.current = { taskId: task.id, mouseX: e.clientX, mouseY: e.clientY };
    setIsDragging(true);
  }

  // Navigation helpers
  function getNavLabel(): string {
    if (viewMode === 'month') {
      return cursor.toLocaleDateString('en-US', { month: isMobile ? 'short' : 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const ws = getWeekStart(cursor);
      const we = addDays(getDateStr(ws), 6);
      if (ws.getMonth() === we.getMonth()) {
        return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.getDate()}, ${we.getFullYear()}`;
      }
      return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    // day
    return cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function handlePrev() {
    if (viewMode === 'month') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(cursor);
      d.setDate(d.getDate() - 7);
      setCursor(d);
    } else {
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      setCursor(d);
    }
  }

  function handleNext() {
    if (viewMode === 'month') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(cursor);
      d.setDate(d.getDate() + 7);
      setCursor(d);
    } else {
      const d = new Date(cursor);
      d.setDate(d.getDate() + 1);
      setCursor(d);
    }
  }

  function handleToday() {
    if (viewMode === 'month') {
      setCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
    } else {
      setCursor(new Date(TODAY));
    }
  }

  // View mode toggle button style
  function pillBtn(label: string, mode: 'month' | 'week' | 'day') {
    const active = viewMode === mode;
    return (
      <button
        key={mode}
        onClick={() => setViewMode(mode)}
        style={{
          fontSize: 11.5,
          fontWeight: active ? 700 : 500,
          padding: '6px 12px',
          border: '1px solid',
          borderColor: active ? COLORS.accent : COLORS.line,
          background: active ? COLORS.accent : '#FFFFFF',
          color: active ? '#FFFFFF' : COLORS.ink,
          borderRadius: 8,
          cursor: 'pointer',
          fontFamily: FF,
          whiteSpace: 'nowrap' as const,
        }}
      >{label}</button>
    );
  }

  // Task pill styling for week/day views
  function taskPillStyle(status: string): React.CSSProperties {
    return {
      fontSize: 10,
      padding: '2px 5px',
      borderRadius: 4,
      background: STATUS_META[status]?.bg || '#F3F4F6',
      color: STATUS_META[status]?.color || COLORS.ink,
      fontWeight: 600,
      cursor: 'pointer',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      position: 'absolute' as const,
      left: 2,
      right: 2,
      zIndex: 2,
      fontFamily: FF,
    };
  }

  // ---- MONTH VIEW (original) ----
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  function tasksOnDay(day: Date | null) {
    if (!day) return [];
    return tasks.filter(t => {
      const s = new Date(t.start);
      const e = addDays(t.start, t.duration - 1);
      return day >= new Date(s.toDateString()) && day <= new Date(e.toDateString());
    });
  }
  const isToday = (d: Date | null) => d && d.toDateString() === TODAY.toDateString();
  const maxChips = isMobile ? 2 : 3;

  function handleQuickAdd(dateStr: string, val: string) {
    if (!val.trim() || !onQuickAdd) return;
    onQuickAdd(val.trim(), dateStr);
    setAddingOnDate(null);
  }

  function renderMonthView() {
    return (
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${COLORS.line}` }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ padding: isMobile ? '8px 0' : '10px 0', textAlign: 'center', fontSize: isMobile ? 11 : 11.5, fontWeight: 700, color: COLORS.gray, letterSpacing: 0.8 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, i) => {
            const dayTasks = tasksOnDay(day);
            const dateStr = day ? day.toISOString().slice(0, 10) : '';
            return (
              <div
                key={i}
                onDoubleClick={() => day && onQuickAdd && setAddingOnDate(dateStr)}
                style={{ minHeight: isMobile ? 52 : 100, borderRight: `1px solid ${COLORS.line}`, borderBottom: `1px solid ${COLORS.line}`, padding: isMobile ? 2 : 6, background: day ? '#FFFFFF' : '#F9FAFB', overflow: 'hidden', cursor: day && onQuickAdd ? 'pointer' : 'default' }}
              >
                {day && <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: isMobile ? 11 : 11.5, fontWeight: isToday(day) ? 700 : 500, color: isToday(day) ? '#FFFFFF' : COLORS.gray, width: isMobile ? 20 : 20, height: isMobile ? 20 : 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isToday(day) ? COLORS.accent : 'transparent' }}>{day.getDate()}</span>
                    {dayTasks.length === 0 && onQuickAdd && (
                      <span
                        onClick={() => setAddingOnDate(dateStr)}
                        style={{ width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.grayLight, opacity: 0, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = COLORS.accent; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = COLORS.grayLight; }}
                      ><Plus size={12} /></span>
                    )}
                  </div>
                  {addingOnDate === dateStr ? (
                    <input
                      ref={addInputRef}
                      autoFocus
                      placeholder="Task name…"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleQuickAdd(dateStr, (e.target as HTMLInputElement).value);
                        if (e.key === 'Escape') setAddingOnDate(null);
                      }}
                      onBlur={() => setAddingOnDate(null)}
                      style={{ width: '100%', fontSize: isMobile ? 9 : 10.5, padding: '1px 4px', border: `1px solid ${COLORS.accent}`, borderRadius: 4, outline: 'none', fontFamily: FF, color: COLORS.ink, boxSizing: 'border-box' as const }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayTasks.slice(0, maxChips).map(t => (
                        <div key={t.id} onClick={() => onOpenTask(t.id)} title={t.name} style={{ fontSize: isMobile ? 9 : 10.5, padding: isMobile ? '1px 4px' : '2px 5px', borderRadius: 9999, cursor: 'pointer', background: STATUS_META[t.status]?.bg || '#F3F4F6', color: STATUS_META[t.status]?.color || COLORS.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isMobile ? '' : t.name}</div>
                      ))}
                      {dayTasks.length > maxChips && <div style={{ fontSize: isMobile ? 8.5 : 10, color: COLORS.gray, fontFamily: FF }}>+{dayTasks.length - maxChips}</div>}
                    </div>
                  )}
                </>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- WEEK VIEW ----
  function renderWeekView() {
    const weekStart = getWeekStart(cursor);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(getDateStr(weekStart), i));
    }

    // Filter tasks with dueDate
    const tasksWithDue = tasks.filter(t => t.dueDate);

    // Group tasks by day column and hour
    function getTasksForCell(day: Date, hour: number): Task[] {
      const dayStr = getDateStr(day);
      return tasksWithDue.filter(t => {
        const dd = new Date(t.dueDate!);
        if (getDateStr(dd) !== dayStr) return false;
        const h = dd.getHours();
        return h >= hour && h < hour + 1;
      });
    }

    const hours: number[] = [];
    for (let h = HOUR_START; h < HOUR_END; h++) hours.push(h);

    return (
      <div
        ref={gridRef}
        style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: 'hidden', userSelect: 'none' }}
      >
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${COLORS.line}`, height: 36 }}>
          {days.map((d, i) => {
            const isTodayCol = d.toDateString() === TODAY.toDateString();
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isTodayCol ? '#FFFBF5' : '#FFFFFF', borderBottom: isTodayCol ? `2px solid ${COLORS.accent}` : undefined }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.gray, fontFamily: FF, lineHeight: 1.2 }}>{DAY_NAMES_SHORT[i]}</span>
                <span style={{ fontSize: 14, fontWeight: isTodayCol ? 700 : 500, color: isTodayCol ? COLORS.accent : COLORS.ink, fontFamily: FF, lineHeight: 1.3 }}>{d.getDate()}</span>
              </div>
            );
          })}
        </div>
        {/* Time grid */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {hours.map(hour => (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: CELL_HEIGHT, borderBottom: `1px solid ${COLORS.lineLight}` }}>
              {days.map((d, di) => {
                const isTodayCol = d.toDateString() === TODAY.toDateString();
                const cellTasks = getTasksForCell(d, hour);
                return (
                  <div key={di} style={{ position: 'relative', borderRight: di < 6 ? `1px solid ${COLORS.lineLight}` : undefined, background: isTodayCol ? '#FFFBF5' : '#FFFFFF' }}>
                    {di === 0 && (
                      <span style={{ position: 'absolute', left: -36, top: -8, fontSize: 10, color: COLORS.grayLight, fontFamily: FF, width: 32, textAlign: 'right' }}>
                        {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
                      </span>
                    )}
                    {cellTasks.map((t, ti) => (
                      <div
                        key={t.id}
                        title={t.name}
                        onClick={() => onOpenTask(t.id)}
                        onMouseDown={(e) => handlePillMouseDown(e, t)}
                        style={{ ...taskPillStyle(t.status), top: 2 + ti * 16 }}
                      >{t.name}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- DAY VIEW ----
  function renderDayView() {
    const day = cursor;
    const dayStr = getDateStr(day);
    const isTodayCol = day.toDateString() === TODAY.toDateString();

    const tasksWithDue = tasks.filter(t => t.dueDate && getDateStr(new Date(t.dueDate!)) === dayStr);

    function getTasksForHour(hour: number): Task[] {
      return tasksWithDue.filter(t => {
        const h = new Date(t.dueDate!).getHours();
        return h >= hour && h < hour + 1;
      });
    }

    const hours: number[] = [];
    for (let h = HOUR_START; h < HOUR_END; h++) hours.push(h);

    return (
      <div
        ref={gridRef}
        style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: 'hidden', userSelect: 'none' }}
      >
        {/* Header */}
        <div style={{ padding: '8px 16px', background: isTodayCol ? '#FFFBF5' : '#FFFFFF', borderBottom: isTodayCol ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.line}` }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, fontFamily: FF, color: isTodayCol ? COLORS.accent : COLORS.ink }}>{day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        {/* Time grid */}
        <div style={{ display: 'flex' }}>
          {/* Hour labels */}
          <div style={{ display: 'flex', flexDirection: 'column', width: 52, flexShrink: 0 }}>
            {hours.map(hour => (
              <div key={hour} style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2 }}>
                <span style={{ fontSize: 10, color: COLORS.grayLight, fontFamily: FF, marginTop: -7 }}>
                  {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
                </span>
              </div>
            ))}
          </div>
          {/* Day column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${COLORS.lineLight}` }}>
            {hours.map(hour => {
              const cellTasks = getTasksForHour(hour);
              return (
                <div key={hour} style={{ position: 'relative', height: CELL_HEIGHT, borderBottom: `1px solid ${COLORS.lineLight}`, background: isTodayCol ? '#FFFBF5' : '#FFFFFF' }}>
                  {cellTasks.map((t, ti) => (
                    <div
                      key={t.id}
                      title={t.name}
                      onClick={() => onOpenTask(t.id)}
                      onMouseDown={(e) => handlePillMouseDown(e, t)}
                      style={{ ...taskPillStyle(t.status), top: 2 + ti * 16 }}
                    >{t.name}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Calendar" subtitle={viewMode === 'month' ? 'Tasks plotted by their scheduled dates' : viewMode === 'week' ? 'Weekly hourly schedule' : 'Daily hourly schedule'} right={
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
          {pillBtn('Month', 'month')}
          {pillBtn('Week', 'week')}
          {pillBtn('Day', 'day')}
          <div style={{ width: 1, height: 20, background: COLORS.line, margin: '0 2px' }} />
          <button onClick={handlePrev} style={iconBtnStyle}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: isMobile ? 11.5 : 13.5, fontWeight: 700, minWidth: isMobile ? 80 : 160, textAlign: 'center', letterSpacing: -0.3, fontFamily: FF, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{getNavLabel()}</span>
          <button onClick={handleNext} style={iconBtnStyle}><ChevronRight size={16} /></button>
          <button onClick={handleToday} style={{ ...iconBtnStyle, width: 'auto', padding: '0 12px', fontSize: 12, fontWeight: 600 }}>Today</button>
        </div>
      } />
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'month' && onQuickAdd && <div style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF, marginTop: 8, textAlign: 'center' }}>Double-click a date or click + to create a task</div>}
      {/* Ghost drag pill */}
      {dragTask && dragPos && (
        <div style={{
          position: 'fixed',
          left: dragPos.x - 40,
          top: dragPos.y - 10,
          pointerEvents: 'none',
          opacity: 0.8,
          fontSize: 10,
          padding: '2px 5px',
          borderRadius: 4,
          background: STATUS_META[dragTask.status]?.bg || '#F3F4F6',
          color: STATUS_META[dragTask.status]?.color || COLORS.ink,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
          fontFamily: FF,
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>{dragTask.name}</div>
      )}
    </div>
  );
}