'use client';

import React from 'react';
import type { Tag } from '@/features/flowdeck/model';
import { TAG_COLORS, FF } from '@/features/flowdeck/model';

export function TagPill({ tag, onRemove, size = 'sm' }: { tag: Tag; onRemove?: () => void; size?: 'sm' | 'md' }) {
  const colorSet = TAG_COLORS.find(c => c.border === tag.color + '80' || c.text === tag.color)
    || TAG_COLORS[0];
  const isSm = size === 'sm';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: isSm ? '2px 8px' : '4px 10px',
        borderRadius: 9999,
        background: colorSet.bg,
        color: colorSet.text,
        fontSize: isSm ? 11 : 12,
        fontWeight: 600,
        fontFamily: FF,
        lineHeight: 1.4,
        border: `1px solid ${colorSet.border}`,
        maxWidth: 140, overflow: 'hidden',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag.name}</span>
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, marginLeft: 2, display: 'flex', alignItems: 'center' }}
        >
          <span style={{ fontSize: 13, lineHeight: 1, opacity: 0.6 }}>&times;</span>
        </button>
      )}
    </span>
  );
}

export function TagPills({ tags, tagMap, onRemoveTag }: { tags: string[]; tagMap: Record<string, Tag>; onRemoveTag?: (tagId: string) => void }) {
  if (!tags.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {tags.map(tagId => {
        const tag = tagMap[tagId];
        if (!tag) return null;
        return <TagPill key={tagId} tag={tag} onRemove={onRemoveTag ? () => onRemoveTag(tagId) : undefined} />;
      })}
    </div>
  );
}
