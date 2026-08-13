'use client';

import React from 'react';
import { teamById, initials, FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { useMemberDirectory } from './MemberDirectory';

/**
 * Deterministic hash → colour so unknown user ids still render a stable
 * avatar instead of falling back to a placeholder. Used as the last-resort
 * branch when neither the MemberDirectory nor `teamById` know the id.
 */
const AVATAR_PALETTE = [
  '#FE8029', '#0891B2', '#D97706', '#DC2626', '#16A34A',
  '#7C3AED', '#DB2777', '#2563EB', '#0EA5E9', '#9333EA',
];

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function hashInitials(id: string): string {
  // Use the first 2 chars of the id uppercased when we have no name.
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  return (clean || '?').slice(0, 2).toUpperCase();
}

/**
 * Resolve a user id to a displayable avatar.
 *
 * Resolution order:
 *   1. MemberDirectory (real `GET /api/projects/:id/members` data)
 *   2. `teamById` (legacy mock seed — kept so existing demo data renders
 *      before the members API responds)
 *   3. Hash-coloured last resort (deterministic colour + id-derived
 *      initials) so the UI never shows a blank gap.
 */
export function Avatar({ id, size = 26 }: { id: string; size?: number }) {
  const { lookup } = useMemberDirectory();
  const person = lookup(id) ?? teamById[id];
  const name = person?.name ?? '';
  const color = person?.color ?? hashColor(id);
  const label = name ? initials(name) : hashInitials(id);
  return (
    <div
      title={name || id}
      style={{
        width: size, height: size, borderRadius: '50%', background: color,
        color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: 700, flexShrink: 0, fontFamily: FF,
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
      }}
    >
      {label}
    </div>
  );
}
