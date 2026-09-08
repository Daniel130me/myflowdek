'use client';

import React from 'react';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';

/**
 * Form field wrapper (audit H-28).
 *
 * Renders a real <label> element wrapping both the caption and the control,
 * so every input inside is implicitly announced by screen readers — the old
 * div-based version left the product's core forms unnamed. Block-level
 * children (divs) remain valid inside a label; interactive controls pick up
 * the association automatically.
 */
export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: COLORS.gray, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FF }}>{label}</span>
      {children}
    </label>
  );
}
