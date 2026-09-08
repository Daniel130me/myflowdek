'use client';

/**
 * Accessible modal primitive (audit H-23).
 *
 * Every hand-rolled overlay in the product used to be a plain fixed-position
 * div: no role=dialog, no focus trap, no focus restore, no scroll lock, and
 * Escape did nothing while the cheat sheet advertised it. This component
 * wraps Radix Dialog so all of those behaviours arrive in one move, and
 * normalises the four layouts the product actually uses.
 *
 * Variants:
 *   center        — classic centered dialog (desktop New Task / Share / cheatsheet)
 *   bottom-sheet  — mobile sheet docked to the bottom edge
 *   left-panel    — drawer sliding from the left edge (mobile nav)
 *   right-panel   — slide-over panel on the right edge (task details)
 *   full          — full-screen takeover (mobile task details)
 *   search        — top-centered palette (global search)
 *
 * The component intentionally accepts raw style objects so existing inner
 * layouts migrate without redesign.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

export type ModalVariant = 'center' | 'bottom-sheet' | 'left-panel' | 'right-panel' | 'full' | 'search';

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(31,33,36,0.5)',
  backdropFilter: 'blur(4px)',
};

function contentStyle(variant: ModalVariant, zIndex: number, style?: CSSProperties): CSSProperties {
  const base: CSSProperties = { position: 'fixed', zIndex, outline: 'none' };
  switch (variant) {
    case 'center':
      return {
        ...base,
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#FFFFFF', borderRadius: 16,
        width: 'min(440px, 92vw)', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
        ...style,
      };
    case 'bottom-sheet':
      return {
        ...base,
        left: 0, right: 0, bottom: 0,
        background: '#FFFFFF', borderRadius: '20px 20px 0 0',
        maxHeight: '90vh', overflowY: 'auto',
        padding: '8px 20px 90px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        ...style,
      };
    case 'left-panel':
      return {
        ...base,
        top: 0, bottom: 0, left: 0,
        background: '#FFFFFF',
        boxShadow: '4px 0 40px rgba(0,0,0,0.12)',
        ...style,
      };
    case 'right-panel':
      return {
        ...base,
        top: 0, bottom: 0, right: 0,
        background: '#FFFFFF', width: 'min(440px, 100vw)',
        padding: 22, overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
        ...style,
      };
    case 'full':
      return {
        ...base,
        inset: 0,
        background: '#FFFFFF',
        overflowY: 'auto',
        ...style,
      };
    case 'search':
      return {
        ...base,
        top: '10vh', left: '50%', transform: 'translateX(-50%)',
        width: '90%', maxWidth: 560,
        background: '#FFFFFF', borderRadius: 16,
        boxShadow: '0 16px 48px rgba(0,0,0,0.2)', overflow: 'hidden',
        ...style,
      };
  }
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Accessible name for the dialog. Pass either `title` (rendered inside the
   * dialog by the caller) or `label` (visually hidden, for icon-only dialogs
   * whose visible header is not an h2/h3).
   */
  label: string;
  /** id of an element inside the dialog that names it (alternative to label). */
  labelId?: string;
  variant?: ModalVariant;
  zIndex?: number;
  style?: CSSProperties;
  children: ReactNode;
}

export function Modal({ open, onClose, label, labelId, variant = 'center', zIndex = 50, style, children }: ModalProps) {
  /* ---------- Focus restore ----------
   * Radix puts focus back on the trigger when `open` flips false while the
   * dialog stays mounted. Most callers here unmount the whole modal on close
   * (`{showModal && <SomeModal/>}`), which bypasses Radix's restore and
   * leaves keyboard focus on <body>. Capture the trigger ourselves, at
   * render time — before Radix's child effects move focus into the dialog —
   * and put it back when the dialog closes or unmounts. */
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current) {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
  }
  wasOpenRef.current = open;

  // Close while mounted: restore as part of the commit.
  useEffect(() => {
    if (!open && restoreFocusRef.current) {
      restoreFocusRef.current.focus();
      restoreFocusRef.current = null;
    }
  }, [open]);

  // Unmount while open (caller removes the modal without closing it).
  useEffect(() => () => {
    restoreFocusRef.current?.focus();
  }, []);

  /* ---------- Escape fallback ----------
   * Radix handles Escape on keys that travel through the dialog content.
   * If focus leaks to <body> (scripts, dev overlays, browser quirks), the
   * key never reaches Content and the cheat-sheet's "Esc closes modal"
   * promise silently breaks. Listen at document level but defer to Radix
   * whenever the key is inside the content — that keeps nested dialogs
   * (confirm-inside-detail-panel) closing topmost-only. */
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const content = contentRef.current;
      if (content && e.target instanceof Node && content.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ ...OVERLAY_STYLE, zIndex }} />
        <Dialog.Content
          ref={contentRef}
          aria-labelledby={labelId}
          aria-label={labelId ? undefined : label}
          // Radix dev-warns when a dialog has neither Description nor an
          // explicit none — every caller here labels via title/label.
          aria-describedby={undefined}
          style={contentStyle(variant, zIndex, style)}
        >
          {/* Screen-reader-only title fallback when the caller has no visible heading. */}
          {!labelId && <Dialog.Title style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{label}</Dialog.Title>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
