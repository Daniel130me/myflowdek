'use client';

import React, { useState } from 'react';
import { COLORS } from '@/features/flowdeck/model';
import { FF } from './styles';

interface FileThumbnailProps {
  name: string;
  thumbnailUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  rounded?: number;
}

const SIZE_MAP = {
  sm: { w: 36, h: 28, radius: 6, fontSize: 8 },
  md: { w: 80, h: 60, radius: 10, fontSize: 10 },
  lg: { w: 160, h: 120, radius: 12, fontSize: 0 },
};

/* Extension → colour tint for the badge overlay */
const EXT_COLORS: Record<string, string> = {
  pdf: '#E53E3E',
  fig: '#A259FF',
  xlsx: '#16A34A',
  xls: '#16A34A',
  csv: '#16A34A',
  docx: '#2563EB',
  doc: '#2563EB',
  png: '#0891B2',
  jpg: '#0891B2',
  jpeg: '#0891B2',
  svg: '#0891B2',
  pptx: '#D97706',
  ppt: '#D97706',
};

export function FileThumbnail({ name, thumbnailUrl, size = 'md', rounded }: FileThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const s = SIZE_MAP[size];
  const radius = rounded ?? s.radius;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const tint = EXT_COLORS[ext] || '#6B7280';

  /* No thumbnail → fallback icon badge */
  if (!thumbnailUrl || errored) {
    return (
      <div style={{
        width: s.w, height: s.h, borderRadius: radius,
        background: `linear-gradient(135deg, ${tint}18, ${tint}30)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden', position: 'relative',
      }}>
        <span style={{
          fontSize: s.fontSize || 10, fontWeight: 800, color: tint,
          fontFamily: FF, textTransform: 'uppercase' as const, letterSpacing: 0.3,
        }}>{ext || 'FILE'}</span>
      </div>
    );
  }

  return (
    <div style={{
      width: s.w, height: s.h, borderRadius: radius,
      overflow: 'hidden', flexShrink: 0, position: 'relative',
      background: '#F3F4F6',
    }}>
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F3F4F6',
        }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${COLORS.line}`, borderTopColor: COLORS.accent, animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
      <img
        src={thumbnailUrl}
        alt={name}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: loaded ? 1 : 0, transition: 'opacity 0.2s ease',
        }}
      />
      {/* Extension badge */}
      <span style={{
        position: 'absolute', bottom: 3, right: 3,
        fontSize: 7, fontWeight: 700, color: '#FFFFFF',
        background: tint, padding: '1px 4px', borderRadius: 4,
        fontFamily: FF, textTransform: 'uppercase' as const, letterSpacing: 0.3,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>{ext}</span>
    </div>
  );
}

/* ---------- FileThumbnailGrid: shows a cluster of small thumbnails ---------- */
interface FileThumbnailGridProps {
  files: Array<{ name: string; thumbnailUrl?: string | null }>;
  max?: number;
}

export function FileThumbnailGrid({ files, max = 3 }: FileThumbnailGridProps) {
  const shown = files.slice(0, max);
  const remaining = files.length - max;
  const gap = 4;

  return (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>
      {shown.map((f, i) => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: 6, overflow: 'hidden',
          border: '2px solid #FFFFFF',
          boxShadow: i === 0 ? 'none' : `0 0 0 -${gap}px #FFFFFF`,
          marginLeft: i === 0 ? 0 : -gap,
          position: 'relative', flexShrink: 0,
          background: '#F3F4F6',
        }}>
          {f.thumbnailUrl ? (
            <img src={f.thumbnailUrl} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #6B728018, #6B728030)',
            }}>
              <span style={{ fontSize: 7, fontWeight: 800, color: '#6B7280', fontFamily: FF }}>{(f.name.split('.').pop() || '').toUpperCase().slice(0, 3)}</span>
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 600, color: COLORS.gray, fontFamily: FF,
          marginLeft: 2,
        }}>+{remaining}</span>
      )}
    </div>
  );
}
