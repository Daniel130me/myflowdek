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
  onUndo: () => void;
  onRedo: () => void;
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

    /* ---------- Ctrl/Cmd combos (work even inside inputs) ---------- */
    if (isMeta(e) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      o.onUndo();
      return;
    }
    if (isMeta(e) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      o.onRedo();
      return;
    }
    if (isMeta(e) && e.key === 'Z') {
      e.preventDefault();
      o.onRedo();
      return;
    }
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

    /* ---------- `Tab` / `Shift+Tab` → indent / outdent ---------- */
    if (e.key === 'Tab' && !isMeta(e)) {
      e.preventDefault();
      if (e.shiftKey) {
        o.onOutdent();
      } else {
        o.onIndent();
      }
      return;
    }

    /* ---------- `Backspace` / `Delete` → delete selected ---------- */
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (o.selectedIds.size > 0) {
        e.preventDefault();
        const count = o.selectedIds.size;
        if (confirm(`Delete ${count} task${count > 1 ? 's' : ''}? This action can be undone with Ctrl+Z.`)) {
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
