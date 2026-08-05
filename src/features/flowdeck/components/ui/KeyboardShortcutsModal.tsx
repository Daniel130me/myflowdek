'use client';

import React from 'react';
import { X, Search, Plus, CheckCircle2, Indent, Outdent, Trash2, Undo2, Redo2, Keyboard, Flag, CircleHelp } from 'lucide-react';
import { COLORS, FF } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';

interface ShortcutEntry {
  keys: string;
  label: string;
  icon?: React.ReactNode;
  separator?: boolean;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: '/', label: 'Focus search', icon: <Search size={15} /> },
  { keys: '?', label: 'Show this cheat sheet', icon: <CircleHelp size={15} /> },
  { keys: 'c', label: 'Create new task', icon: <Plus size={15} /> },
  { keys: 'Space', label: 'Toggle complete (selected task)', icon: <CheckCircle2 size={15} /> },
  { keys: '1', label: 'Set priority → Urgent', icon: <Flag size={15} style={{ color: COLORS.red }} /> },
  { keys: '2', label: 'Set priority → High', icon: <Flag size={15} style={{ color: COLORS.amber }} /> },
  { keys: '3', label: 'Set priority → Medium', icon: <Flag size={15} style={{ color: COLORS.teal }} /> },
  { keys: '4', label: 'Set priority → Low', icon: <Flag size={15} style={{ color: COLORS.gray }} /> },
  { keys: 'Tab', label: 'Indent selected tasks', icon: <Indent size={15} /> },
  { keys: 'Shift + Tab', label: 'Outdent selected tasks', icon: <Outdent size={15} /> },
  { keys: 'Backspace / Del', label: 'Delete selected tasks', icon: <Trash2 size={15} /> },
  { keys: '\u2318Z / Ctrl+Z', label: 'Undo', icon: <Undo2 size={15} />, separator: true },
  { keys: '\u2318\u21E7Z / Ctrl+Shift+Z', label: 'Redo', icon: <Redo2 size={15} /> },
  { keys: 'Esc', label: 'Close modal / dismiss', icon: <Keyboard size={15} />, separator: true },
];

export function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isMobile } = useViewport();
  const overlayRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [open, onClose]);

  if (!open) return null;

  /* ---------- Mobile: bottom sheet ---------- */
  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div ref={overlayRef} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
        <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '8px 20px 32px', maxHeight: '85vh', overflowY: 'auto' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line, margin: '4px auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: FF, fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Keyboard size={18} style={{ color: COLORS.gray }} />
              Keyboard shortcuts
            </h3>
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SHORTCUTS.map((s, i) => (
              <div key={i}>
                {s.separator && i > 0 && <div style={{ height: 1, background: COLORS.lineLight, margin: '10px 0' }} />}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', minHeight: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.grayLight }}>{s.icon}</span>
                    <span style={{ fontSize: 14, fontFamily: FF, color: COLORS.ink }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: FF, color: COLORS.gray, background: COLORS.graySoft, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{s.keys}</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: COLORS.grayLight, fontFamily: FF, textAlign: 'center', marginTop: 16 }}>
            Shortcuts only work outside text inputs
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Desktop: centered modal ---------- */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={overlayRef} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <div
        style={{
          position: 'relative',
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 24,
          width: 'min(520px, 92vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: FF, fontSize: 17, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Keyboard size={18} style={{ color: COLORS.gray }} />
            Keyboard shortcuts
          </h3>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: 4,
              borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: COLORS.gray, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = COLORS.graySoft; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts list — two-column grid on wider screens */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {SHORTCUTS.map((s, i) => (
            <div key={i}>
              {s.separator && i > 0 && <div style={{ height: 1, background: COLORS.lineLight, margin: '10px 0', gridColumn: i < 11 ? undefined : '1 / -1' }} />}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', minHeight: 38 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.grayLight, flexShrink: 0 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, fontFamily: FF, color: COLORS.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                </div>
                <kbd
                  style={{
                    fontSize: 11, fontFamily: FF, color: COLORS.gray, background: COLORS.graySoft,
                    padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0,
                    border: `1px solid ${COLORS.line}`,
                  }}
                >
                  {s.keys}
                </kbd>
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <p style={{ fontSize: 11.5, color: COLORS.grayLight, fontFamily: FF, textAlign: 'center', marginTop: 18 }}>
          Shortcuts only fire when not focused on a text input, textarea, or select
        </p>
      </div>
    </div>
  );
}
