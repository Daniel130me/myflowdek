'use client';

import React from 'react';
import { teamById, initials, FONT_FAMILY as FF } from '@/features/flowdeck/model';

export function Avatar({ id, size = 26 }: { id: string; size?: number }) {
  const person = teamById[id];
  if (!person) return null;
  return (
    <div
      title={person.name}
      style={{
        width: size, height: size, borderRadius: '50%', background: person.color,
        color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: 700, flexShrink: 0, fontFamily: FF,
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
      }}
    >
      {initials(person.name)}
    </div>
  );
}
