'use client';

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Zap,
  X,
  ArrowRight,
  ChevronDown,
  Power,
  PowerOff,
  Sparkles,
  CalendarClock,
  UserCheck,
  Flag,
  CircleDot,
  MessageSquare,
  Calendar,
  Tag as TagIcon,
} from 'lucide-react';
import {
  COLORS,
  FF,
  STATUS_META,
  PRIORITY_META,
  type Project,
  type Tag,
  type AutomationRule,
  type AutomationTrigger,
  type AutomationAction,
} from '@/features/flowdeck/model';
import { SectionHeader, useMemberDirectory, useProjectMembers } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import { toast } from 'sonner';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface AutomationsViewProps {
  automations: AutomationRule[];
  projects: Record<string, Project>;
  tagsByProject: Record<string, Tag[]>;
  currentProjectId: string | null;
  onAdd: (rule: AutomationRule) => void;
  onUpdate: (id: string, patch: Partial<AutomationRule>) => void;
  onDelete: (id: string) => void;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const TRIGGER_OPTIONS: { value: AutomationTrigger['type']; label: string; icon: React.ReactNode; needsValue: boolean }[] = [
  { value: 'status_change', label: 'When status changes to…', icon: <CircleDot size={15} />, needsValue: true },
  { value: 'priority_change', label: 'When priority changes to…', icon: <Flag size={15} />, needsValue: true },
  { value: 'assignee_change', label: 'When assignee changes', icon: <UserCheck size={15} />, needsValue: false },
  { value: 'task_completed', label: 'When task is completed', icon: <Sparkles size={15} />, needsValue: false },
  { value: 'due_date_approaching', label: 'When due date is approaching…', icon: <CalendarClock size={15} />, needsValue: false },
];

const ACTION_OPTIONS: { value: AutomationAction['type']; label: string; icon: React.ReactNode; valueType: 'status' | 'priority' | 'assignee' | 'tag' | 'text' | 'date' }[] = [
  { value: 'set_status', label: 'Set status to…', icon: <CircleDot size={15} />, valueType: 'status' },
  { value: 'set_priority', label: 'Set priority to…', icon: <Flag size={15} />, valueType: 'priority' },
  { value: 'set_assignee', label: 'Set assignee to…', icon: <UserCheck size={15} />, valueType: 'assignee' },
  { value: 'add_tag', label: 'Add tag…', icon: <TagIcon size={15} />, valueType: 'tag' },
  { value: 'remove_tag', label: 'Remove tag…', icon: <TagIcon size={15} />, valueType: 'tag' },
  { value: 'add_comment', label: 'Add comment…', icon: <MessageSquare size={15} />, valueType: 'text' },
  { value: 'set_due_date', label: 'Set due date to…', icon: <Calendar size={15} />, valueType: 'date' },
];

/* -------------------------------------------------------------------------- */
/*  Shared styles                                                             */
/* -------------------------------------------------------------------------- */

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  background: COLORS.paper,
  fontFamily: FF,
  minHeight: 44,
  boxSizing: 'border-box',
  outline: 'none',
};

const selectInputStyle: React.CSSProperties = {
  ...inputStyle,
  background: COLORS.graySoft,
  appearance: 'none' as any,
  WebkitAppearance: 'none' as any,
  paddingRight: 36,
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%236B7280' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 18px',
  borderRadius: 10,
  border: 'none',
  background: COLORS.accent,
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: FF,
};

const secondaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 18px',
  borderRadius: 10,
  border: `1px solid ${COLORS.line}`,
  background: COLORS.card,
  color: COLORS.ink,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: FF,
};

/* -------------------------------------------------------------------------- */
/*  Helper functions                                                          */
/* -------------------------------------------------------------------------- */

function getTriggerLabel(trigger: AutomationTrigger): string {
  switch (trigger.type) {
    case 'status_change':
      return `Status changes to ${STATUS_META[trigger.value || '']?.label || trigger.value || '…'}`;
    case 'priority_change':
      return `Priority changes to ${PRIORITY_META[trigger.value || '']?.label || trigger.value || '…'}`;
    case 'assignee_change':
      return 'Assignee changes';
    case 'task_completed':
      return 'Task is completed';
    case 'due_date_approaching':
      return `Due date is ${trigger.daysBefore || 1} day${(trigger.daysBefore || 1) !== 1 ? 's' : ''} away`;
    default:
      return trigger.type;
  }
}

function getActionLabel(action: AutomationAction, resolveMember?: (id: string) => { name: string } | undefined): string {
  switch (action.type) {
    case 'set_status':
      return `Set status → ${STATUS_META[action.value || '']?.label || action.value || '…'}`;
    case 'set_priority':
      return `Set priority → ${PRIORITY_META[action.value || '']?.label || action.value || '…'}`;
    case 'set_assignee': {
      const member = resolveMember?.(action.value || '');
      return `Set assignee → ${member?.name || action.value || '…'}`;
    }
    case 'add_tag':
      return `Add tag "${action.value || '…'}"`;
    case 'remove_tag':
      return `Remove tag "${action.value || '…'}"`;
    case 'add_comment':
      return `Add comment: "${(action.value || '…').length > 40 ? (action.value || '').slice(0, 40) + '…' : action.value || '…'}"`;
    case 'set_due_date':
      return `Set due date → ${action.value || '…'}`;
    default:
      return action.type;
  }
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                               */
/* -------------------------------------------------------------------------- */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { isMobile } = useViewport();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '48px 24px' : '72px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: isMobile ? 56 : 72,
          height: isMobile ? 56 : 72,
          borderRadius: '50%',
          background: COLORS.accentSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Zap size={isMobile ? 26 : 32} color={COLORS.accent} strokeWidth={1.8} />
      </div>
      <h3
        style={{
          fontFamily: FF,
          fontSize: isMobile ? 17 : 19,
          fontWeight: 700,
          margin: 0,
          marginBottom: 8,
          color: COLORS.ink,
        }}
      >
        No automations yet
      </h3>
      <p
        style={{
          fontFamily: FF,
          fontSize: isMobile ? 13 : 14,
          color: COLORS.gray,
          margin: 0,
          marginBottom: 24,
          maxWidth: 380,
          lineHeight: 1.5,
        }}
      >
        Automate repetitive work with &quot;When X happens → Do Y&quot; rules.
        Save time and keep your projects on track.
      </p>
      <button onClick={onCreate} style={primaryBtnStyle}>
        <Plus size={16} /> Create automation
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Automation card                                                           */
/* -------------------------------------------------------------------------- */

function AutomationCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
  resolveMember,
}: {
  rule: AutomationRule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  resolveMember?: (id: string) => { name: string } | undefined;
}) {
  const { isMobile } = useViewport();

  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${rule.enabled ? COLORS.line : COLORS.lineLight}`,
        borderRadius: 12,
        padding: isMobile ? '14px 16px' : '16px 20px',
        opacity: rule.enabled ? 1 : 0.6,
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Top row: name + toggle + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <button
            onClick={onToggle}
            title={rule.enabled ? 'Disable' : 'Enable'}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              border: 'none',
              background: rule.enabled ? COLORS.accent : COLORS.line,
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
              flexShrink: 0,
              padding: 0,
              minWidth: 40,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: rule.enabled ? 21 : 3,
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          </button>
          <span
            style={{
              fontFamily: FF,
              fontSize: isMobile ? 14 : 15,
              fontWeight: 600,
              color: COLORS.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {rule.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={onEdit}
            title="Edit"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: COLORS.gray,
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 36,
              minWidth: 36,
            }}
          >
            <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: COLORS.gray,
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 36,
              minWidth: 36,
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Trigger → Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {/* Trigger pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: COLORS.accentSoft,
            color: COLORS.accentDark,
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: isMobile ? 12 : 13,
            fontWeight: 600,
            fontFamily: FF,
            whiteSpace: 'nowrap',
          }}
        >
          <Zap size={13} />
          {getTriggerLabel(rule.trigger)}
        </div>

        {/* Arrow */}
        <ArrowRight
          size={16}
          color={COLORS.grayLight}
          style={{ flexShrink: 0, marginTop: 4 }}
        />

        {/* Action pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rule.actions.map((action, i) => (
            <div
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: rule.enabled ? COLORS.greenSoft : COLORS.graySoft,
                color: rule.enabled ? COLORS.green : COLORS.gray,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: isMobile ? 12 : 13,
                fontWeight: 500,
                fontFamily: FF,
                whiteSpace: 'nowrap',
              }}
            >
              {getActionLabel(action, resolveMember)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Create / Edit automation form                                             */
/* -------------------------------------------------------------------------- */

interface DraftAction {
  type: AutomationAction['type'];
  value: string;
}

function AutomationForm({
  initial,
  allTags,
  members,
  onSave,
  onCancel,
}: {
  initial?: AutomationRule;
  allTags: Tag[];
  members: { id: string; name: string }[];
  onSave: (rule: AutomationRule) => void;
  onCancel: () => void;
}) {
  const { isMobile } = useViewport();
  const isEditing = !!initial;

  const [name, setName] = useState(initial?.name || '');
  const [triggerType, setTriggerType] = useState<AutomationTrigger['type']>(
    initial?.trigger.type || 'status_change',
  );
  const [triggerValue, setTriggerValue] = useState(initial?.trigger.value || '');
  const [daysBefore, setDaysBefore] = useState(initial?.trigger.daysBefore || 3);
  const [actions, setActions] = useState<DraftAction[]>(
    initial
      ? initial.actions.map((a) => ({ type: a.type, value: a.value || '' }))
      : [{ type: 'set_status', value: 'inprogress' }],
  );

  const currentTriggerOpt = TRIGGER_OPTIONS.find((t) => t.value === triggerType);
  const needsValue = currentTriggerOpt?.needsValue ?? false;

  const addAction = useCallback(() => {
    setActions((prev) => [...prev, { type: 'set_status', value: '' }]);
  }, []);

  const removeAction = useCallback((index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateAction = useCallback((index: number, patch: Partial<DraftAction>) => {
    setActions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...patch, value: patch.type ? '' : a.value } : a)),
    );
  }, []);

  const canSave = name.trim().length > 0 && actions.length > 0 && actions.every((a) => a.value.length > 0);

  const handleSave = () => {
    if (!canSave) return;

    const trigger: AutomationTrigger = { type: triggerType };
    if (needsValue) trigger.value = triggerValue;
    if (triggerType === 'due_date_approaching') trigger.daysBefore = daysBefore;

    const rule: AutomationRule = {
      id: initial?.id || 'auto_' + Math.random().toString(36).slice(2, 10),
      name: name.trim(),
      enabled: initial?.enabled ?? true,
      trigger,
      actions: actions.map((a) => {
        const action: AutomationAction = { type: a.type };
        if (a.value) action.value = a.value;
        return action;
      }),
      createdAt: initial?.createdAt || new Date().toISOString(),
    };

    onSave(rule);
  };

  const formCard: React.CSSProperties = {
    background: COLORS.card,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 14,
    padding: isMobile ? 16 : 24,
    marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: FF,
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.gray,
    letterSpacing: 0.5,
    marginBottom: 6,
    display: 'block',
  };

  const rowGap = 16;

  return (
    <div style={formCard}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            fontFamily: FF,
            fontSize: isMobile ? 16 : 18,
            fontWeight: 700,
            margin: 0,
            color: COLORS.ink,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Zap size={18} color={COLORS.accent} />
          {isEditing ? 'Edit automation' : 'New automation'}
        </h3>
        <button
          onClick={onCancel}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: COLORS.gray,
            padding: 6,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 36,
            minWidth: 36,
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Rule name */}
      <div style={{ marginBottom: rowGap }}>
        <label style={labelStyle}>RULE NAME</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Move to Review when In Progress for 3 days"
          style={inputStyle}
        />
      </div>

      {/* Trigger section */}
      <div
        style={{
          marginBottom: rowGap,
          padding: isMobile ? 14 : 18,
          background: COLORS.paper,
          borderRadius: 12,
          border: `1px solid ${COLORS.lineLight}`,
        }}
      >
        <div
          style={{
            fontFamily: FF,
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.ink,
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Zap size={14} color={COLORS.accent} />
          TRIGGER
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 10,
          }}
        >
          <div>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as AutomationTrigger['type'])}
              style={selectInputStyle}
            >
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {triggerType === 'status_change' && (
            <div>
              <select
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                style={selectInputStyle}
              >
                <option value="">Select status…</option>
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {triggerType === 'priority_change' && (
            <div>
              <select
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                style={selectInputStyle}
              >
                <option value="">Select priority…</option>
                {Object.entries(PRIORITY_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {triggerType === 'due_date_approaching' && (
            <div>
              <input
                type="number"
                min={1}
                max={30}
                value={daysBefore}
                onChange={(e) => setDaysBefore(Math.max(1, Math.min(30, Number(e.target.value))))}
                placeholder="Days before"
                style={inputStyle}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions section */}
      <div
        style={{
          marginBottom: rowGap,
          padding: isMobile ? 14 : 18,
          background: COLORS.paper,
          borderRadius: 12,
          border: `1px solid ${COLORS.lineLight}`,
        }}
      >
        <div
          style={{
            fontFamily: FF,
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.ink,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ArrowRight size={14} color={COLORS.green} />
          ACTIONS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actions.map((action, index) => {
            const actionOpt = ACTION_OPTIONS.find((o) => o.value === action.type);
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {/* Action type select */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <select
                    value={action.type}
                    onChange={(e) =>
                      updateAction(index, { type: e.target.value as AutomationAction['type'] })
                    }
                    style={selectInputStyle}
                  >
                    {ACTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value input based on type */}
                {actionOpt?.valueType === 'status' && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <select
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      style={selectInputStyle}
                    >
                      <option value="">Select…</option>
                      {Object.entries(STATUS_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {actionOpt?.valueType === 'priority' && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <select
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      style={selectInputStyle}
                    >
                      <option value="">Select…</option>
                      {Object.entries(PRIORITY_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {actionOpt?.valueType === 'assignee' && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <select
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      style={selectInputStyle}
                    >
                      <option value="">Select…</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {actionOpt?.valueType === 'tag' && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <select
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      style={selectInputStyle}
                    >
                      <option value="">Select tag…</option>
                      {allTags.map((tag) => (
                        <option key={tag.id} value={tag.name}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {actionOpt?.valueType === 'text' && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      placeholder="Comment text…"
                      style={inputStyle}
                    />
                  </div>
                )}

                {actionOpt?.valueType === 'date' && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="date"
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                )}

                {/* Remove action button */}
                <button
                  onClick={() => removeAction(index)}
                  title="Remove action"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: COLORS.gray,
                    padding: 6,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 44,
                    minWidth: 44,
                    flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add action button */}
        <button
          onClick={addAction}
          style={{
            ...secondaryBtnStyle,
            marginTop: 12,
            width: '100%',
            justifyContent: 'center',
            padding: '9px 18px',
            fontSize: 13,
          }}
        >
          <Plus size={15} /> Add action
        </button>
      </div>

      {/* Footer buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
        }}
      >
        <button onClick={onCancel} style={secondaryBtnStyle}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            ...primaryBtnStyle,
            opacity: canSave ? 1 : 0.5,
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          {isEditing ? 'Save changes' : 'Create automation'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main view                                                                 */
/* -------------------------------------------------------------------------- */

export function AutomationsView({
  automations,
  projects,
  tagsByProject,
  currentProjectId,
  onAdd,
  onUpdate,
  onDelete,
}: AutomationsViewProps) {
  const { isMobile } = useViewport();
  // Real project members — populates the assignee picker in the rule form
  // and the assignee label resolver used by AutomationCard. Falls back to
  // an empty list when no project is selected.
  const { members } = useProjectMembers(currentProjectId ?? null);
  const { lookup: lookupMember } = useMemberDirectory();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Collect all tags across projects for the tag picker
  const allTags = Object.values(tagsByProject).flat();

  const editingRule = editingId ? automations.find((r) => r.id === editingId) : undefined;

  const handleAdd = (rule: AutomationRule) => {
    onAdd(rule);
    setShowForm(false);
    toast.success('Automation created', { description: `"${rule.name}" is now active.` });
  };

  const handleUpdate = (rule: AutomationRule) => {
    onUpdate(rule.id, rule);
    setEditingId(null);
    toast.success('Automation updated', { description: `"${rule.name}" has been saved.` });
  };

  const handleToggle = (id: string) => {
    const rule = automations.find((r) => r.id === id);
    if (!rule) return;
    onUpdate(id, { enabled: !rule.enabled });
    toast.success(!rule.enabled ? 'Automation enabled' : 'Automation disabled', {
      description: `"${rule.name}" is now ${!rule.enabled ? 'active' : 'paused'}.`,
    });
  };

  const handleDelete = (id: string) => {
    const rule = automations.find((r) => r.id === id);
    if (!rule) return;
    onDelete(id);
    toast.success('Automation deleted', { description: `"${rule.name}" has been removed.` });
    if (editingId === id) setEditingId(null);
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleStartEdit = (id: string) => {
    setShowForm(false);
    setEditingId(id);
  };

  const isFormVisible = showForm || !!editingId;

  return (
    <div>
      <SectionHeader
        title="Automations"
        subtitle={`${automations.length} rule${automations.length !== 1 ? 's' : ''}`}
        right={
          !isFormVisible ? (
            <button
              onClick={handleStartCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: COLORS.accent,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: isMobile ? '9px 14px' : '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: FF,
              }}
            >
              <Plus size={15} /> New rule
            </button>
          ) : undefined
        }
      />

      {/* Create/Edit form */}
      {isFormVisible && (
        <AutomationForm
          initial={editingRule}
          allTags={allTags}
          members={members}
          onSave={editingRule ? handleUpdate : handleAdd}
          onCancel={handleCancel}
        />
      )}

      {/* Automation cards list */}
      {automations.length === 0 && !isFormVisible ? (
        <EmptyState onCreate={handleStartCreate} />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {automations.map((rule) =>
            editingId === rule.id ? null : (
              <AutomationCard
                key={rule.id}
                rule={rule}
                resolveMember={lookupMember}
                onToggle={() => handleToggle(rule.id)}
                onEdit={() => handleStartEdit(rule.id)}
                onDelete={() => handleDelete(rule.id)}
              />
            ),
          )}
          {automations.length === 0 && isFormVisible && (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                color: COLORS.gray,
                fontSize: 13,
                fontFamily: FF,
              }}
            >
              Your first automation will appear here after you create it.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
