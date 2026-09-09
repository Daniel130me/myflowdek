'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

/**
 * Promise-based destructive confirmation (audit Table 7.1 — one shared
 * confirm idiom instead of three).
 *
 * Any component under <ConfirmProvider> can await a single shared dialog:
 *
 *   const confirm = useConfirmDialog();
 *   if (!(await confirm({ title: 'Delete section?', description: '...' }))) return;
 *
 * This lets native confirm() call sites migrate without restructuring their
 * surrounding control flow, and every prompt renders through the same
 * styled, keyboard-accessible dialog.
 */
export interface ConfirmOptions {
  title?: string;
  description?: string;
  /** Exact phrase the user must type before the confirm button enables. */
  requireTyped?: string;
  confirmLabel?: string;
  /** Number of items being deleted; >1 makes the dialog demand "DELETE". */
  count?: number;
}

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

interface PendingRequest {
  opts: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingRequest | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts = {}) => new Promise<boolean>((resolve) => setPending({ opts, resolve })),
    [],
  );

  const close = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDeleteDialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) close(false); }}
        title={pending?.opts.title}
        description={pending?.opts.description}
        requireTyped={pending?.opts.requireTyped}
        confirmLabel={pending?.opts.confirmLabel}
        count={pending?.opts.count ?? 1}
        onConfirm={() => close(true)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog(): ConfirmFn {
  return useContext(ConfirmContext);
}
