'use client';

import { RefreshCw } from 'lucide-react';
import { COLORS, FF } from '@/features/flowdeck/model';

/**
 * Shared "fetch failed" panel with a retry action.
 *
 * Audit (Section 5 / QW15): fetch errors used to render as meaningful-looking
 * empty states — the user saw "no data" when the request had actually failed.
 * Any list surface that fails to load shows this instead, with a retry.
 */
export function LoadErrorPanel({
  title = 'Could not load data',
  description = 'Check your connection, then try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" style={{ display: 'grid', placeItems: 'center', gap: 12, minHeight: 220, padding: 24, textAlign: 'center', fontFamily: FF }}>
      <div>
        <p style={{ margin: '0 0 5px', color: COLORS.ink, fontSize: 15, fontWeight: 700 }}>{title}</p>
        <p style={{ margin: 0, color: COLORS.gray, fontSize: 13 }}>{description}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '9px 14px', border: 0, borderRadius: 9, background: COLORS.accent, color: '#FFFFFF', fontFamily: FF, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >
        <RefreshCw size={15} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
