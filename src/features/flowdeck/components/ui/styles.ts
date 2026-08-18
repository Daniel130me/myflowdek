'use client';

import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';

export { FF };

export const selectStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  background: '#F3F4F6',
  fontFamily: FF,
  minHeight: 44,
  boxSizing: 'border-box',
};

export const popoverRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  textAlign: 'left',
  padding: '9px 10px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 13,
  borderRadius: 10,
  fontFamily: FF,
  minHeight: 40,
};
