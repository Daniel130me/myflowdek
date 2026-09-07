'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcutsOptions {
  activeView: string;
  searchQuery: string;
  selectedIds: Set<string>;
  onToggleComplete: (id: string) => void;
  onIndent: () => void;
  onOutdent: () => void;
  onDelete: () => void;
  onShowNewTask: () => void;
  onSearchFocus: () => void;
  onShowShortcuts: () => void;
  onOpenCommandPalette: () => void;
  onDuplicate?: () => void;
}

/** Check if the event target is a text-editable element */
function isEditable(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/** Check for Mac vs other platforms */
function isMeta(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

export function useKeyboardShortcuts(opts: KeyboardShortcutsOptions): void {
  // Keep a ref so the effect always reads the latest values without re-subscribing
  const ref = useRef(opts);
  useEffect(() => { ref.current = opts; });

  const handler = useCallback((e: KeyboardEvent) => {
    const o = ref.current;
    const editable = isEditable(e.target);

    /* ---------- Ctrl/Cmd combos (work even inside inputs) ----------
     * Note: Cmd+Z is deliberately NOT intercepted — undo/redo is not
     * implemented for persisted changes (audit H-01), and letting the
     * browser handle it preserves native text undo inside inputs. */
    /* ---------- Cmd+K → command palette (works even inside inputs) ---------- */
    if (isMeta(e) && e.key === 'k') {
      e.preventDefault();
      o.onOpenCommandPalette();
      return;
    }
    /* ---------- Cmd+D → duplicate selected task ---------- */
    if (isMeta(e) && e.key === 'd' && !e.shiftKey) {
      e.preventDefault();
      o.onDuplicate?.();
      return;
    }

    // All shortcuts below only fire when NOT in an editable element
    if (editable) return;

    /* ---------- `/` → focus search ---------- */
    if (e.key === '/') {
      e.preventDefault();
      o.onSearchFocus();
      return;
    }

    /* ---------- `?` → show shortcuts cheat sheet ---------- */
    if (e.key === '?') {
      e.preventDefault();
      o.onShowShortcuts();
      return;
    }

    /* ---------- `Space` → toggle complete on first selected ---------- */
    if (e.key === ' ' && !e.shiftKey && !isMeta(e)) {
      if (o.selectedIds.size > 0) {
        e.preventDefault();
        const firstId = [...o.selectedIds][0];
        o.onToggleComplete(firstId);
        return;
      }
    }

    /* ---------- `1/2/3/4` → set priority (urgent/high/medium/low) ---------- */
    if (['1', '2', '3', '4'].includes(e.key) && !isMeta(e) && !e.shiftKey) {
      if (o.selectedIds.size > 0) {
        e.preventDefault();
        // Priority mapping: 1=urgent, 2=high, 3=medium, 4=low
        const priorityMap: Record<string, string> = { '1': 'urgent', '2': 'high', '3': 'medium', '4': 'low' };
        // We dispatch a custom event so the page handler can pick it up and apply
        // the priority change via the store's updateTask.
        // The hook consumer is expected to listen for this event.
        window.dispatchEvent(new CustomEvent('flowdeck:set-priority', {
          detail: { priority: priorityMap[e.key] },
        }));
        return;
      }
    }

    /* ---------- `Alt+Arrow` → indent / outdent selected tasks ----------
     * Plain Tab is never intercepted: it must always move keyboard focus
     * between controls (WCAG 2.1.1 Keyboard / 2.1.2 No Keyboard Trap).
     * Indent/outdent only make sense with an active selection, so the
     * Alt+Arrow shortcut is gated on selectedIds as well. */
    if (e.altKey && e.key === 'ArrowRight' && o.selectedIds.size > 0 && !isMeta(e)) {
      e.preventDefault();
      o.onIndent();
      return;
    }
    if (e.altKey && e.key === 'ArrowLeft' && o.selectedIds.size > 0 && !isMeta(e)) {
      e.preventDefault();
      o.onOutdent();
      return;
    }

    /* ---------- `Backspace` / `Delete` → delete selected ---------- */
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (o.selectedIds.size > 0) {
        e.preventDefault();
        const count = o.selectedIds.size;
        // Honest copy: undo/redo is not implemented for persisted tasks
        // (audit H-01/H-02) — never promise recoverability we don't have.
        if (confirm(`Delete ${count} task${count > 1 ? 's' : ''}? This permanently deletes them.`)) {
          o.onDelete();
        }
        return;
      }
    }

    /* ---------- `c` (no modifiers) → create new task ---------- */
    if (e.key === 'c' && !isMeta(e) && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      o.onShowNewTask();
      return;
    }

    /* ---------- `Escape` → no-op placeholder ---------- */
    if (e.key === 'Escape') {
      // Could close modals later
      return;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
