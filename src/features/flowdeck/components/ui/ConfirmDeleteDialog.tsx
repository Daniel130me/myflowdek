'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FF, COLORS } from '@/features/flowdeck/model';

/**
 * Shared destructive-action confirmation (audit H-03).
 *
 * Every delete path routes through this dialog so no mouse-driven delete is
 * instantaneous anymore. Bulk deletes additionally require typing DELETE —
 * deletion is permanent (undo/redo was removed as dishonest, audit H-01),
 * so the copy must never promise otherwise.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  count,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Number of items about to be deleted. >1 requires typing DELETE. */
  count: number;
  onConfirm: () => void;
}) {
  const bulk = count > 1;
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const confirmed = !bulk || typed.trim().toUpperCase() === 'DELETE';
  const heading = title ?? `Delete ${count} task${count === 1 ? '' : 's'}?`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 400 }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: FF }}>{heading}</DialogTitle>
          <DialogDescription style={{ fontFamily: FF }}>
            {description ?? `This will permanently delete ${count} task${count === 1 ? '' : 's'}. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        {bulk && (
          <div style={{ marginTop: 4 }}>
            <label htmlFor="confirm-delete-typed" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6, fontFamily: FF }}>
              Type <span style={{ fontWeight: 800 }}>DELETE</span> to confirm
            </label>
            <input
              id="confirm-delete-typed"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: FF, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}
        <DialogFooter style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${COLORS.line}`, background: '#FFFFFF', color: COLORS.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FF }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed}
            onClick={() => { onConfirm(); onOpenChange(false); }}
            style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: confirmed ? COLORS.red : COLORS.line, color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: confirmed ? 'pointer' : 'not-allowed', fontFamily: FF }}
          >
            Delete {count > 1 ? `${count} tasks` : 'task'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
