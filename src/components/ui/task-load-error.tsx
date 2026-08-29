'use client';

import { RefreshCw } from 'lucide-react';
import { COLORS, FF } from '@/features/flowdeck/model';

export function TaskLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" style={{ display: 'grid', placeItems: 'center', gap: 12, minHeight: 220, padding: 24, textAlign: 'center', fontFamily: FF }}>
      <div>
        <p style={{ margin: '0 0 5px', color: COLORS.ink, fontSize: 15, fontWeight: 700 }}>Task could not be loaded</p>
        <p style={{ margin: 0, color: COLORS.gray, fontSize: 13 }}>Check your connection, then try again.</p>
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
