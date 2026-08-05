'use client';

import React from 'react';
import { Plus, Check } from 'lucide-react';
import { COLORS, STATUS_META, teamById, getDirectChildren, buildParentSummary, type Task } from '@/features/flowdeck/model';
import { Avatar } from './Avatar';
import { FF } from './styles';

interface SubtasksSectionProps {
  taskId: string;
  tasks: Task[];
  onOpenTask: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
}

export function SubtasksSection({ taskId, tasks, onOpenTask, onAddSubtask }: SubtasksSectionProps) {
  const children = getDirectChildren(taskId, tasks);
  const summary = buildParentSummary(taskId, tasks);

  if (children.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FF }}>
            Subtasks
          </span>
          <span style={{ fontSize: 12, color: COLORS.grayLight, fontFamily: FF }}>
            {summary.done}/{summary.total}
          </span>
        </div>
        {/* Mini progress bar */}
        <div style={{ width: 80, height: 7, borderRadius: 9999, background: COLORS.lineLight, overflow: 'hidden', flexShrink: 0 }}>
          <div
            style={{
              width: `${summary.avgProgress}%`,
              height: '100%',
              borderRadius: 9999,
              background: summary.avgProgress === 100 ? COLORS.green : COLORS.accent,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Child task rows */}
      <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: 'hidden' }}>
        {children.map((child, idx) => {
          const isDone = child.status === 'done';
          const sm = STATUS_META[child.status];
          return (
            <div
              key={child.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderBottom: idx < children.length - 1 ? `1px solid ${COLORS.line}` : 'none',
                background: '#FFFFFF',
              }}
            >
              {/* Checkbox circle */}
              <div
                onClick={() => {}}
                style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: isDone ? 'none' : `1.5px solid ${COLORS.line}`,
                  background: isDone ? COLORS.green : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'default',
                }}
              >
                {isDone && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
              </div>

              {/* Task name (clickable) */}
              <span
                onClick={() => onOpenTask(child.id)}
                style={{
                  flex: 1, fontSize: 13.5, fontFamily: FF, fontWeight: 500,
                  color: isDone ? COLORS.grayLight : COLORS.ink,
                  textDecoration: isDone ? 'line-through' : 'none',
                  cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {child.name}
              </span>

              {/* Assignee avatar */}
              <Avatar id={child.assignee} size={18} />

              {/* Status pill (small) */}
              {sm && (
                <span style={{
                  fontSize: 10.5, fontWeight: 600, fontFamily: FF,
                  padding: '2px 8px', borderRadius: 9999, whiteSpace: 'nowrap',
                  background: sm.bg, color: sm.color, flexShrink: 0,
                }}>
                  {sm.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Add subtask button */}
      <button
        onClick={() => onAddSubtask(taskId)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', marginTop: 8, padding: '8px 0',
          border: `1px dashed ${COLORS.line}`, borderRadius: 8,
          background: 'transparent', cursor: 'pointer',
          fontSize: 12.5, fontWeight: 600, color: COLORS.gray, fontFamily: FF,
        }}
      >
        <Plus size={14} />
        Add subtask
      </button>
    </div>
  );
}
