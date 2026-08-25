'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Check } from 'lucide-react';
import { COLORS, type MemberInfo } from '@/features/flowdeck/model';
import { FF } from './styles';
import { Avatar } from './Avatar';
import { Field } from './Field';

interface FollowersSectionProps {
  followerIds: string[];
  onToggle: (userId: string) => void;
  currentUserId: string;
  /** Real project members (sourced from `useProjectMembers`). When
   *  omitted the picker is empty — we never fall back to the mock TEAM. */
  members?: MemberInfo[];
}

export function FollowersSection({ followerIds, onToggle, currentUserId, members = [] }: FollowersSectionProps) {
  const [showPicker, setShowPicker] = useState(false);
  const isFollowing = followerIds.includes(currentUserId);

  const available = members.filter(m => !followerIds.includes(m.id));
  const followers = members.filter(m => followerIds.includes(m.id));

  return (
    <Field label={
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Eye size={13} color={COLORS.gray} />
        <span>Followers ({followers.length})</span>
      </div>
    }>
      {/* Current followers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {followers.length > 0 ? followers.map(m => (
          <div key={m.id} title={`${m.name} (click to remove)`} onClick={() => onToggle(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 6px 3px 3px', borderRadius: 8, background: COLORS.graySoft, cursor: 'pointer', border: 'none', fontFamily: FF }}>
            <Avatar id={m.id} size={22} />
            <span style={{ fontSize: 11.5, fontWeight: 500, color: COLORS.ink, fontFamily: FF }}>{m.name.split(' ')[0]}</span>
            <EyeOff size={10} color={COLORS.grayLight} style={{ marginLeft: 1 }} />
          </div>
        )) : (
          <span style={{ fontSize: 12, color: COLORS.grayLight, fontFamily: FF }}>No followers yet</span>
        )}
      </div>

      {/* Add follower button */}
      {available.length > 0 && (
        <div style={{ position: 'relative', marginTop: 8 }}>
          <button onClick={() => setShowPicker(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${COLORS.line}`, background: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontFamily: FF, color: COLORS.gray, transition: 'border-color 0.15s' }}>
            <Plus size={13} />
            Add follower
          </button>
          {showPicker && (
            <>
              <div onClick={() => setShowPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', zIndex: 50, padding: 4, minWidth: 200, maxHeight: 200, overflowY: 'auto' }}>
                {/* Follow/Unfollow self first */}
                <button onClick={() => { onToggle(currentUserId); setShowPicker(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', background: isFollowing ? COLORS.accentSoft : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: FF }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isFollowing ? COLORS.accent : COLORS.line}`, background: isFollowing ? COLORS.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isFollowing && <Check size={10} color='#FFFFFF' />}
                  </div>
                  <Avatar id={currentUserId} size={22} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.ink, fontFamily: FF }}>Follow this task</div>
                    <div style={{ fontSize: 10.5, color: COLORS.gray, fontFamily: FF }}>Get notified of changes</div>
                  </div>
                </button>
                <div style={{ height: 1, background: COLORS.lineLight, margin: '4px 6px' }} />
                {available.map(m => (
                  <button key={m.id} onClick={() => { onToggle(m.id); setShowPicker(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: FF }}>
                    <Avatar id={m.id} size={22} />
                    <div>
                      <div style={{ fontSize: 12.5, color: COLORS.ink, fontFamily: FF }}>{m.name}</div>
                      <div style={{ fontSize: 10.5, color: COLORS.gray, fontFamily: FF }}>{m.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Field>
  );
}
