'use client';

import React from 'react';
import { STATUS_META, FONT_FAMILY as FF } from '@/features/flowdeck/model';

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status];
  if (!m) return null;
  return (
    <span style={{
      background: m.bg, color: m.color, fontSize: 12, fontWeight: 600,
      padding: '4px 10px', borderRadius: 9999, whiteSpace: 'nowrap', fontFamily: FF
    }}>
      {m.label}
    </span>
  );
}
