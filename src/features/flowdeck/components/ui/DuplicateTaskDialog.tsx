'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy } from 'lucide-react';
import { COLORS } from '@/features/flowdeck/model';
import { FF } from './styles';
import { useViewport } from '../../hooks/useViewport';

/* ---- Checkbox row (declared outside to avoid react-hooks/static-components) ---- */
function CheckRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        border: `1.5px solid ${disabled ? COLORS.lineLight : COLORS.line}`,
        background: disabled ? COLORS.lineLight : '#FFFFFF',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.15s, background 0.15s',
        minHeight: 44,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: 18, height: 18, borderRadius: 5,
          border: `2px solid ${checked ? COLORS.accent : COLORS.line}`,
          background: checked ? COLORS.accent : '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span style={{ fontSize: 14, fontFamily: FF, color: COLORS.ink, lineHeight: 1.3 }}>
        {label}
      </span>
    </label>
  );
}

interface DuplicateTaskDialogProps {
  taskName: string;
  hasSubtasks: boolean;
  hasComments: boolean;
  hasAttachments: boolean;
  onConfirm: (opts: {
    includeSubtasks: boolean;
    includeComments: boolean;
    includeAttachments: boolean;
  }) => void;
  onCancel: () => void;
}

export function DuplicateTaskDialog({
  taskName, hasSubtasks, hasComments, hasAttachments, onConfirm, onCancel,
}: DuplicateTaskDialogProps) {
  const { isMobile } = useViewport();
  const [includeSubtasks, setIncludeSubtasks] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [onCancel]);

  function handleConfirm() {
    onConfirm({ includeSubtasks, includeComments, includeAttachments });
  }

  /* ---- Shared inner content ---- */
  const inner = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 12, minWidth: 0 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Copy size={18} style={{ color: COLORS.accent }} />
          </span>
          <h3 style={{ fontFamily: FF, fontSize: 16, fontWeight: 700, margin: 0, color: COLORS.ink, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            Duplicate "{taskName}"
          </h3>
        </div>
        {!isMobile && (
          <button onClick={onCancel} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.gray }}><X size={18} /></button>
        )}
      </div>
      <p style={{ fontSize: 13.5, fontFamily: FF, color: COLORS.gray, margin: '8px 0 20px', lineHeight: 1.45 }}>Choose what to include in the duplicate.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <CheckRow label="Include subtasks" checked={includeSubtasks} disabled={!hasSubtasks} onChange={setIncludeSubtasks} />
        <CheckRow label="Include comments" checked={includeComments} disabled={!hasComments} onChange={setIncludeComments} />
        <CheckRow label="Include attachments" checked={includeAttachments} disabled={!hasAttachments} onChange={setIncludeAttachments} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ fontFamily: FF, fontSize: 14, fontWeight: 600, padding: '10px 20px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, background: '#FFFFFF', color: COLORS.ink, cursor: 'pointer', minHeight: 44 }}>
          Cancel
        </button>
        <button onClick={handleConfirm} style={{ fontFamily: FF, fontSize: 14, fontWeight: 600, padding: '10px 20px', borderRadius: 10, border: 'none', background: COLORS.accent, color: '#FFFFFF', cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Copy size={15} /> Duplicate
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
        <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '8px 20px 32px', maxHeight: '85vh', overflowY: 'auto' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line, margin: '4px auto 16px' }} />
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 16, padding: 24, width: 'min(420px, 92vw)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)' }}>
        {inner}
      </div>
    </div>
  );
}
