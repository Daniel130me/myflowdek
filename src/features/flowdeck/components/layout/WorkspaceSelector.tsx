'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Building2, Check, Settings } from 'lucide-react';
import { FONT_FAMILY as FF, COLORS } from '@/features/flowdeck/model';
import type { WorkspaceSummary } from '../../hooks/useWorkspaces';

interface WorkspaceSelectorProps {
  workspaces: WorkspaceSummary[];
  selectedWorkspace: WorkspaceSummary | null;
  onSelect: (id: string) => void;
  /** Compact mode for mobile sidebars. */
  compact?: boolean;
}

/**
 * A dropdown workspace switcher. Shows the current workspace name and role,
 * and lets the user switch between workspaces they belong to.
 *
 * Used in the sidebar to establish the tenant context before showing projects.
 */
export function WorkspaceSelector({
  workspaces,
  selectedWorkspace,
  onSelect,
  compact = false,
}: WorkspaceSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayWorkspaces = workspaces.length > 0 ? workspaces : (selectedWorkspace ? [selectedWorkspace] : []);
  const currentWorkspace = selectedWorkspace ?? (displayWorkspaces.length > 0 ? displayWorkspaces[0] : null);

  return (
    <div ref={ref} style={{ position: 'relative', padding: compact ? '8px 12px' : '8px 12px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 10,
          border: `1px solid rgba(255,255,255,0.08)`,
          background: 'rgba(255,255,255,0.05)',
          cursor: 'pointer',
          color: '#E5E7EB',
          fontFamily: FF,
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'left',
        }}
      >
        <Building2 size={15} style={{ opacity: 0.7, flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentWorkspace?.name ?? 'Workspace'}
        </span>
        {currentWorkspace && (
          <span style={{
            fontSize: 10, fontWeight: 500, opacity: 0.5,
            textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
          }}>
            {currentWorkspace.role}
          </span>
        )}
        <ChevronDown size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 12,
          right: 12,
          marginTop: 4,
          background: '#2D2F33',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 100,
          overflow: 'hidden',
          maxHeight: 280,
          overflowY: 'auto',
        }}>
          {displayWorkspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                onSelect(ws.id);
                setOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                border: 'none',
                background: ws.id === currentWorkspace?.id ? 'rgba(254,128,41,0.12)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: FF,
                fontSize: 13,
                color: '#E5E7EB',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <Building2 size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ws.name}
              </span>
              <span style={{ fontSize: 10, opacity: 0.4, textTransform: 'uppercase' }}>
                {ws.role}
              </span>
              {ws.id === currentWorkspace?.id && (
                <Check size={14} color="#FE8029" style={{ flexShrink: 0 }} />
              )}
            </button>
          ))}
          {displayWorkspaces.length > 0 && (
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
          )}
          <button
            onClick={() => {
              setOpen(false);
              router.push('/settings');
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: FF,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#FE8029',
            }}
          >
            <Settings size={14} style={{ flexShrink: 0 }} />
            Workspace Settings & Storage
          </button>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#9CA3AF',
  fontFamily: FF,
};
