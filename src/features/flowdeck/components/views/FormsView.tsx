'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  FileText,
  X,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  GripVertical,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Inbox,
  Send,
  Calendar,
  LayoutList,
} from 'lucide-react';
import {
  COLORS,
  FF,
  fmtDate,
  type Form,
  type FormField,
  type FormSubmission,
  type Project,
  TODAY,
} from '@/features/flowdeck/model';
import { SectionHeader } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import { toast } from 'sonner';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface FormsViewProps {
  forms: Form[];
  submissions: FormSubmission[];
  projects: Record<string, Project>;
  currentProjectId: string | null;
  onAddForm: (form: Form) => void;
  onUpdateForm: (id: string, patch: Partial<Form>) => void;
  onDeleteForm: (id: string) => void;
}

type FieldType = FormField['type'];

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'email', label: 'Email' },
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
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: FF,
};

const cardStyle: React.CSSProperties = {
  background: COLORS.card,
  borderRadius: 14,
  border: `1px solid ${COLORS.line}`,
  padding: 18,
  marginBottom: 10,
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

let _uid = 0;
function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${++_uid}`;
}

function submissionCountForForm(formId: string, submissions: FormSubmission[]): number {
  return submissions.filter((s) => s.formId === formId).length;
}

function getFormById(formId: string, forms: Form[]): Form | undefined {
  return forms.find((f) => f.id === formId);
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                               */
/* -------------------------------------------------------------------------- */

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const { isMobile } = useViewport();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '48px 20px' : '72px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: isMobile ? 56 : 64,
          height: isMobile ? 56 : 64,
          borderRadius: '50%',
          background: COLORS.accentSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          color: COLORS.accent,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: isMobile ? 15 : 16,
          fontWeight: 600,
          color: COLORS.ink,
          fontFamily: FF,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: COLORS.gray,
          fontFamily: FF,
          maxWidth: 360,
          lineHeight: 1.5,
          marginBottom: action ? 20 : 0,
        }}
      >
        {description}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tabs                                                                      */
/* -------------------------------------------------------------------------- */

function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  const { isMobile } = useViewport();
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: `1px solid ${COLORS.line}`,
        marginBottom: 20,
      }}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: isActive
                ? `2px solid ${COLORS.accent}`
                : '2px solid transparent',
              color: isActive ? COLORS.ink : COLORS.gray,
              fontWeight: isActive ? 600 : 400,
              fontSize: isMobile ? 13 : 14,
              fontFamily: FF,
              padding: isMobile ? '8px 14px' : '10px 20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  background: isActive
                    ? COLORS.accentSoft
                    : COLORS.graySoft,
                  color: isActive ? COLORS.accent : COLORS.gray,
                  padding: '1px 7px',
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form Card                                                                 */
/* -------------------------------------------------------------------------- */

function FormCard({
  form,
  projectName,
  submissionCount,
  onToggle,
  onEdit,
  onDelete,
  onCopyLink,
  onPreview,
}: {
  form: Form;
  projectName: string;
  submissionCount: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onPreview: () => void;
}) {
  const { isMobile } = useViewport();

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.ink,
                fontFamily: FF,
              }}
            >
              {form.name}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: FF,
                padding: '2px 8px',
                borderRadius: 8,
                background: form.isActive ? COLORS.greenSoft : COLORS.graySoft,
                color: form.isActive ? COLORS.green : COLORS.gray,
              }}
            >
              {form.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              fontSize: 12,
              color: COLORS.gray,
              fontFamily: FF,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <LayoutList size={13} />
              {projectName}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FileText size={13} />
              {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Send size={13} />
              {submissionCount} submission{submissionCount !== 1 ? 's' : ''}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={13} />
              {fmtDate(form.createdAt)}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <ActionButton
            icon={form.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
            title={form.isActive ? 'Deactivate' : 'Activate'}
            onClick={onToggle}
          />
          <ActionButton
            icon={<Eye size={15} />}
            title="Preview"
            onClick={onPreview}
            tint={COLORS.teal}
          />
          <ActionButton
            icon={<Copy size={15} />}
            title="Copy link"
            onClick={onCopyLink}
          />
          <ActionButton
            icon={<Pencil size={15} />}
            title="Edit"
            onClick={onEdit}
          />
          <ActionButton
            icon={<Trash2 size={15} />}
            title="Delete"
            onClick={onDelete}
            tint={COLORS.red}
          />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  title,
  onClick,
  tint,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  tint?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 6,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tint || COLORS.gray,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          COLORS.graySoft;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'none';
      }}
    >
      {icon}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form Builder (inline)                                                     */
/* -------------------------------------------------------------------------- */

interface FieldDraft {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
}

function FormBuilder({
  initial,
  projects,
  currentProjectId,
  onSave,
  onCancel,
}: {
  initial?: Form;
  projects: Record<string, Project>;
  currentProjectId: string | null;
  onSave: (form: Form) => void;
  onCancel: () => void;
}) {
  const { isMobile } = useViewport();
  const [name, setName] = useState(initial?.name ?? '');
  const [projectId, setProjectId] = useState(
    initial?.projectId ?? (currentProjectId || '')
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [fields, setFields] = useState<FieldDraft[]>(
    initial
      ? initial.fields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options ?? [],
        }))
      : []
  );

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      {
        id: uid('ff'),
        label: '',
        type: 'text' as FieldType,
        required: false,
        options: [],
      },
    ]);
  }, []);

  const updateField = useCallback((idx: number, patch: Partial<FieldDraft>) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        const updated = { ...f, ...patch };
        if (patch.type === 'select' && !updated.options.length) {
          updated.options = ['Option 1'];
        }
        return updated;
      })
    );
  }, []);

  const removeField = useCallback((idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addOption = useCallback((fieldIdx: number) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== fieldIdx) return f;
        return {
          ...f,
          options: [...f.options, `Option ${f.options.length + 1}`],
        };
      })
    );
  }, []);

  const updateOption = useCallback(
    (fieldIdx: number, optIdx: number, value: string) => {
      setFields((prev) =>
        prev.map((f, i) => {
          if (i !== fieldIdx) return f;
          const newOpts = [...f.options];
          newOpts[optIdx] = value;
          return { ...f, options: newOpts };
        })
      );
    },
    []
  );

  const removeOption = useCallback((fieldIdx: number, optIdx: number) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== fieldIdx) return f;
        return { ...f, options: f.options.filter((_, oi) => oi !== optIdx) };
      })
    );
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      toast.error('Form name is required');
      return;
    }
    if (!projectId) {
      toast.error('Please select a project');
      return;
    }
    const validFields = fields.filter((f) => f.label.trim());
    if (validFields.length === 0 && !initial) {
      toast.error('Add at least one field');
      return;
    }
    const formFields: FormField[] = validFields.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      required: f.required,
      ...(f.type === 'select' ? { options: f.options.filter((o) => o.trim()) } : {}),
    }));

    const form: Form = {
      id: initial?.id ?? uid('form'),
      projectId,
      name: name.trim(),
      description: description.trim() || undefined,
      fields: formFields,
      createdAt: initial?.createdAt ?? TODAY.toISOString().slice(0, 10),
      isActive: initial?.isActive ?? true,
    };
    onSave(form);
  }, [name, projectId, description, fields, initial, onSave]);

  return (
    <div
      style={{
        ...cardStyle,
        border: `2px solid ${COLORS.accent}`,
        background: COLORS.accentSoft,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: isMobile ? 14 : 15,
          fontWeight: 600,
          color: COLORS.ink,
          fontFamily: FF,
          marginBottom: 16,
        }}
      >
        {initial ? 'Edit Form' : 'Create New Form'}
      </div>

      {/* Form name */}
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.gray,
            fontFamily: FF,
            marginBottom: 5,
          }}
        >
          Form Name <span style={{ color: COLORS.red }}>*</span>
        </label>
        <input
          style={inputStyle}
          placeholder="e.g. Feature Request Form"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Project selector */}
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.gray,
            fontFamily: FF,
            marginBottom: 5,
          }}
        >
          Project <span style={{ color: COLORS.red }}>*</span>
        </label>
        <select
          style={selectInputStyle}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Select project…</option>
          {Object.values(projects).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 18 }}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.gray,
            fontFamily: FF,
            marginBottom: 5,
          }}
        >
          Description (optional)
        </label>
        <textarea
          style={{
            ...inputStyle,
            minHeight: 72,
            resize: 'vertical' as const,
          }}
          placeholder="Describe the purpose of this form…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Fields */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.ink,
              fontFamily: FF,
            }}
          >
            Fields ({fields.length})
          </span>
          <button
            onClick={addField}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: `1px dashed ${COLORS.line}`,
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: COLORS.accent,
              cursor: 'pointer',
              fontFamily: FF,
            }}
          >
            <Plus size={14} />
            Add Field
          </button>
        </div>

        {fields.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 12px',
              color: COLORS.gray,
              fontSize: 13,
              fontFamily: FF,
              background: COLORS.card,
              borderRadius: 10,
              border: `1px dashed ${COLORS.line}`,
            }}
          >
            No fields yet. Click &quot;Add Field&quot; to get started.
          </div>
        )}

        {fields.map((field, idx) => (
          <div
            key={field.id}
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 12,
              padding: isMobile ? 12 : 14,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              {/* Drag handle (visual only) */}
              <div
                style={{
                  color: COLORS.grayLight,
                  cursor: 'default',
                  paddingTop: 12,
                  flexShrink: 0,
                }}
              >
                <GripVertical size={16} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 8,
                    flexDirection: isMobile ? 'column' : 'row',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <input
                      style={inputStyle}
                      placeholder="Field label"
                      value={field.label}
                      onChange={(e) =>
                        updateField(idx, { label: e.target.value })
                      }
                    />
                  </div>
                  <div style={{ width: isMobile ? '100%' : 160, flexShrink: 0 }}>
                    <select
                      style={selectInputStyle}
                      value={field.type}
                      onChange={(e) =>
                        updateField(idx, {
                          type: e.target.value as FieldType,
                        })
                      }
                    >
                      {FIELD_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Required checkbox */}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: COLORS.gray,
                    fontFamily: FF,
                    cursor: 'pointer',
                    marginBottom: field.type === 'select' ? 10 : 0,
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateField(idx, { required: e.target.checked })
                    }
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: COLORS.accent,
                      cursor: 'pointer',
                    }}
                  />
                  Required
                </label>

                {/* Select options */}
                {field.type === 'select' && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: COLORS.gray,
                        fontFamily: FF,
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Options
                    </div>
                    {field.options.map((opt, oi) => (
                      <div
                        key={oi}
                        style={{
                          display: 'flex',
                          gap: 6,
                          marginBottom: 6,
                          alignItems: 'center',
                        }}
                      >
                        <input
                          style={{ ...inputStyle, flex: 1 }}
                          value={opt}
                          placeholder={`Option ${oi + 1}`}
                          onChange={(e) =>
                            updateOption(idx, oi, e.target.value)
                          }
                        />
                        <button
                          onClick={() => removeOption(idx, oi)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: COLORS.grayLight,
                            padding: 4,
                            borderRadius: 6,
                            display: 'flex',
                            flexShrink: 0,
                          }}
                          title="Remove option"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(idx)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'none',
                        border: `1px dashed ${COLORS.line}`,
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 12,
                        color: COLORS.accent,
                        cursor: 'pointer',
                        fontFamily: FF,
                      }}
                    >
                      <Plus size={13} />
                      Add option
                    </button>
                  </div>
                )}
              </div>

              {/* Remove field */}
              <button
                onClick={() => removeField(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: COLORS.grayLight,
                  padding: 6,
                  borderRadius: 8,
                  display: 'flex',
                  flexShrink: 0,
                  marginTop: isMobile ? 0 : 4,
                }}
                title="Remove field"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save / Cancel */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
          paddingTop: 8,
          borderTop: `1px solid ${COLORS.line}`,
        }}
      >
        <button onClick={onCancel} style={secondaryBtnStyle}>
          Cancel
        </button>
        <button onClick={handleSave} style={primaryBtnStyle}>
          <CheckCircle2 size={16} />
          {initial ? 'Update Form' : 'Create Form'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form Preview (read-only)                                                  */
/* -------------------------------------------------------------------------- */

function FormPreview({
  form,
  onClose,
}: {
  form: Form;
  onClose: () => void;
}) {
  const { isMobile } = useViewport();
  return (
    <div
      style={{
        ...cardStyle,
        border: `2px solid ${COLORS.teal}`,
        background: COLORS.card,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Eye size={16} style={{ color: COLORS.teal }} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: COLORS.ink,
              fontFamily: FF,
            }}
          >
            Preview: {form.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: COLORS.gray,
            padding: 4,
            borderRadius: 6,
            display: 'flex',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {form.description && (
        <div
          style={{
            fontSize: 13,
            color: COLORS.gray,
            fontFamily: FF,
            lineHeight: 1.5,
            marginBottom: 16,
          }}
        >
          {form.description}
        </div>
      )}

      <div
        style={{
          background: COLORS.graySoft,
          borderRadius: 10,
          padding: isMobile ? 14 : 20,
        }}
      >
        {form.fields.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: COLORS.gray,
              fontSize: 13,
              fontFamily: FF,
              padding: '16px 0',
            }}
          >
            This form has no fields.
          </div>
        ) : (
          form.fields.map((field) => (
            <div
              key={field.id}
              style={{
                marginBottom: 16,
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.ink,
                  fontFamily: FF,
                  marginBottom: 5,
                }}
              >
                {field.label}
                {field.required && (
                  <span style={{ color: COLORS.red }}> *</span>
                )}
              </label>

              {field.type === 'textarea' ? (
                <div
                  style={{
                    ...inputStyle,
                    minHeight: 72,
                    background: COLORS.card,
                    color: COLORS.grayLight,
                  }}
                >
                  Text area input
                </div>
              ) : field.type === 'select' ? (
                <div
                  style={{
                    ...selectInputStyle,
                    background: COLORS.card,
                    color: COLORS.grayLight,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Select an option…
                </div>
              ) : field.type === 'date' ? (
                <div
                  style={{
                    ...inputStyle,
                    background: COLORS.card,
                    color: COLORS.grayLight,
                  }}
                >
                  Date picker
                </div>
              ) : field.type === 'number' ? (
                <div
                  style={{
                    ...inputStyle,
                    background: COLORS.card,
                    color: COLORS.grayLight,
                  }}
                >
                  Number input
                </div>
              ) : field.type === 'email' ? (
                <div
                  style={{
                    ...inputStyle,
                    background: COLORS.card,
                    color: COLORS.grayLight,
                  }}
                >
                  Email input
                </div>
              ) : (
                <div
                  style={{
                    ...inputStyle,
                    background: COLORS.card,
                    color: COLORS.grayLight,
                  }}
                >
                  Text input
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Submissions Table / Cards                                                 */
/* -------------------------------------------------------------------------- */

function SubmissionsList({
  submissions,
  forms,
  projects,
}: {
  submissions: FormSubmission[];
  forms: Form[];
  projects: Record<string, Project>;
}) {
  const { isMobile } = useViewport();

  if (submissions.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={28} />}
        title="No submissions yet"
        description="When people fill out your forms, their submissions will appear here."
      />
    );
  }

  const sorted = [...submissions].sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  if (isMobile) {
    return (
      <div>
        {sorted.map((sub) => {
          const form = getFormById(sub.formId, forms);
          const proj = sub.projectId
            ? projects[sub.projectId]
            : undefined;
          const dataEntries = Object.entries(sub.data);
          const firstTwo = dataEntries.slice(0, 2);

          return (
            <div
              key={sub.id}
              style={{
                ...cardStyle,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.ink,
                  fontFamily: FF,
                  marginBottom: 6,
                }}
              >
                {form?.name ?? 'Unknown Form'}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.gray,
                  fontFamily: FF,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Calendar size={12} />
                  {fmtDate(sub.submittedAt)}
                </span>
                {proj && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <LayoutList size={12} />
                    {proj.name}
                  </span>
                )}
              </div>
              {firstTwo.length > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: COLORS.gray,
                    fontFamily: FF,
                    lineHeight: 1.6,
                  }}
                >
                  {firstTwo.map(([key, val]) => (
                    <div key={key}>
                      <span style={{ fontWeight: 600, color: COLORS.ink }}>
                        {key}:
                      </span>{' '}
                      {val}
                    </div>
                  ))}
                  {dataEntries.length > 2 && (
                    <div style={{ color: COLORS.grayLight, marginTop: 2 }}>
                      +{dataEntries.length - 2} more field
                      {dataEntries.length - 2 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* Desktop: table */
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.gray,
    fontFamily: FF,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    padding: '8px 12px',
    borderBottom: `1px solid ${COLORS.line}`,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: FF,
    padding: '12px 12px',
    borderBottom: `1px solid ${COLORS.lineLight}`,
    verticalAlign: 'top',
  };

  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 14,
        border: `1px solid ${COLORS.line}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse' as const,
            minWidth: 560,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Form</th>
              <th style={thStyle}>Submitted</th>
              <th style={thStyle}>Project</th>
              <th style={thStyle}>Data Summary</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((sub) => {
              const form = getFormById(sub.formId, forms);
              const proj = sub.projectId
                ? projects[sub.projectId]
                : undefined;
              const dataEntries = Object.entries(sub.data);
              const firstTwo = dataEntries.slice(0, 2);

              return (
                <tr key={sub.id}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>
                      {form?.name ?? 'Unknown Form'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {fmtDate(sub.submittedAt)}
                  </td>
                  <td style={tdStyle}>
                    {proj ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: proj.color,
                            flexShrink: 0,
                          }}
                        />
                        {proj.name}
                      </span>
                    ) : (
                      <span style={{ color: COLORS.grayLight }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {firstTwo.length > 0 ? (
                      <div style={{ lineHeight: 1.6 }}>
                        {firstTwo.map(([key, val]) => (
                          <div key={key}>
                            <span style={{ fontWeight: 600 }}>{key}:</span>{' '}
                            <span style={{ color: COLORS.gray }}>{val}</span>
                          </div>
                        ))}
                        {dataEntries.length > 2 && (
                          <div
                            style={{
                              fontSize: 11,
                              color: COLORS.grayLight,
                              marginTop: 2,
                            }}
                          >
                            +{dataEntries.length - 2} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: COLORS.grayLight }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main FormsView                                                            */
/* -------------------------------------------------------------------------- */

export function FormsView({
  forms,
  submissions,
  projects,
  currentProjectId,
  onAddForm,
  onUpdateForm,
  onDeleteForm,
}: FormsViewProps) {
  const { isMobile } = useViewport();

  const [activeTab, setActiveTab] = useState<'forms' | 'submissions'>('forms');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | undefined>(undefined);
  const [previewForm, setPreviewForm] = useState<Form | undefined>(undefined);

  const filteredForms = useMemo(() => {
    let list = forms;
    if (currentProjectId) {
      list = list.filter((f) => f.projectId === currentProjectId);
    }
    return list;
  }, [forms, currentProjectId]);

  const filteredSubmissions = useMemo(() => {
    let list = submissions;
    if (currentProjectId) {
      list = list.filter((s) => s.projectId === currentProjectId);
    }
    return list;
  }, [submissions, currentProjectId]);

  const handleCreate = useCallback(() => {
    setEditingForm(undefined);
    setShowBuilder(true);
  }, []);

  const handleEdit = useCallback((form: Form) => {
    setEditingForm(form);
    setShowBuilder(true);
  }, []);

  const handleSave = useCallback(
    (form: Form) => {
      if (editingForm) {
        onUpdateForm(form.id, form);
        toast.success('Form updated');
      } else {
        onAddForm(form);
        toast.success('Form created');
      }
      setShowBuilder(false);
      setEditingForm(undefined);
    },
    [editingForm, onAddForm, onUpdateForm]
  );

  const handleCancel = useCallback(() => {
    setShowBuilder(false);
    setEditingForm(undefined);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      onDeleteForm(id);
      toast.success('Form deleted');
    },
    [onDeleteForm]
  );

  const handleToggle = useCallback(
    (form: Form) => {
      onUpdateForm(form.id, { isActive: !form.isActive });
      toast.success(
        form.isActive ? 'Form deactivated' : 'Form activated'
      );
    },
    [onUpdateForm]
  );

  const handleCopyLink = useCallback((form: Form) => {
    const url = `${window.location.origin}/form/${form.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard');
    });
  }, []);

  return (
    <div>
      <SectionHeader
        title={isMobile ? 'Forms' : 'Forms & Request Intake'}
        subtitle={
          currentProjectId
            ? `Showing forms for ${projects[currentProjectId]?.name ?? ''}`
            : 'Create forms to collect structured requests from external people'
        }
        right={
          activeTab === 'forms' && !showBuilder ? (
            <button onClick={handleCreate} style={primaryBtnStyle}>
              <Plus size={16} />
              {isMobile ? 'Create' : 'Create Form'}
            </button>
          ) : undefined
        }
      />

      <TabBar
        tabs={[
          { id: 'forms', label: 'My Forms', count: filteredForms.length },
          {
            id: 'submissions',
            label: 'Submissions',
            count: filteredSubmissions.length,
          },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as 'forms' | 'submissions')}
      />

      {/* Forms tab */}
      {activeTab === 'forms' && (
        <div>
          {previewForm && (
            <FormPreview
              form={previewForm}
              onClose={() => setPreviewForm(undefined)}
            />
          )}

          {showBuilder && (
            <FormBuilder
              initial={editingForm}
              projects={projects}
              currentProjectId={currentProjectId}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}

          {!showBuilder && filteredForms.length === 0 && (
            <EmptyState
              icon={<ClipboardList size={28} />}
              title="No forms yet"
              description="Create a form to start collecting structured requests. Submissions will automatically become tasks in your project."
              action={
                <button onClick={handleCreate} style={primaryBtnStyle}>
                  <Plus size={16} />
                  Create Your First Form
                </button>
              }
            />
          )}

          {!showBuilder &&
            filteredForms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                projectName={
                  projects[form.projectId]?.name ?? 'Unknown Project'
                }
                submissionCount={submissionCountForForm(
                  form.id,
                  submissions
                )}
                onToggle={() => handleToggle(form)}
                onEdit={() => handleEdit(form)}
                onDelete={() => handleDelete(form.id)}
                onCopyLink={() => handleCopyLink(form)}
                onPreview={() => setPreviewForm(form)}
              />
            ))}
        </div>
      )}

      {/* Submissions tab */}
      {activeTab === 'submissions' && (
        <SubmissionsList
          submissions={filteredSubmissions}
          forms={forms}
          projects={projects}
        />
      )}
    </div>
  );
}
export default FormsView;
