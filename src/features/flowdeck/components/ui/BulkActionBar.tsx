'use client';

import React from 'react';
import {
  X, Trash2, UserPlus, Flag, CheckCircle2, Copy, Scissors, ClipboardPaste,
  Link2, Unlink2, Bold, Palette, Milestone, Clock, Tag as TagIcon, FileUp,
  CalendarDays, ArrowRight, FolderInput, Play,
} from 'lucide-react';
import { COLORS, TEAM, PRIORITY_META, TAG_COLORS, STATUS_META, STATUS_ORDER, type Tag, type Project } from '@/features/flowdeck/model';
import { FF } from './styles';
import { useViewport } from '../../hooks/useViewport';

interface BulkActionBarProps {
  count: number;
  onClearSelection: () => void;
  onBulkAssign: (memberId: string) => void;
  onSetPriority: (priority: string) => void;
  onComplete: () => void;
  onDelete: () => void;
  onLink: () => void;
  onUnlink: () => void;
  onBold: () => void;
  onMilestone: () => void;
  onAttachFiles: (fileList: FileList) => void;
  /* #30: Bulk duplicate */
  onDuplicateBulk?: () => void;
  /* #34: Extended bulk operations */
  onBulkSetDueDate?: (date: string | null) => void;
  onBulkAddTag?: (tagId: string) => void;
  onBulkRemoveTag?: (tagId: string) => void;
  onBulkSetStatus?: (status: string) => void;
  onBulkMoveToProject?: (targetProjectId: string) => void;
  tags?: Tag[];
  projects?: Record<string, Project>;
  currentProjectId?: string | null;
}

export function BulkActionBar({
  count, onClearSelection, onBulkAssign, onSetPriority, onComplete,
  onDelete, onLink, onUnlink, onBold, onMilestone, onAttachFiles,
  onDuplicateBulk, onBulkSetDueDate, onBulkAddTag, onBulkRemoveTag, onBulkSetStatus,
  onBulkMoveToProject, tags = [], projects, currentProjectId,
}: BulkActionBarProps) {
  const { isMobile } = useViewport();
  const [showAssign, setShowAssign] = React.useState(false);
  const [showPriority, setShowPriority] = React.useState(false);
  const [showStatus, setShowStatus] = React.useState(false);
  const [showTag, setShowTag] = React.useState(false);
  const [showDueDate, setShowDueDate] = React.useState(false);
  const [showProject, setShowProject] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  if (count === 0) return null;

  const bar: React.CSSProperties = {
    position: 'fixed', bottom: isMobile ? 76 : 20, left: '50%', transform: 'translateX(-50%)',
    zIndex: 45,
    background: COLORS.navy,
    borderRadius: isMobile ? 16 : 14,
    padding: isMobile ? '10px 14px' : '8px 12px',
    display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 4,
    boxShadow: '0 10px 25px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.15)',
    maxWidth: 'calc(100vw - 32px)',
    overflow: 'visible',
  };

  const countBadge: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, fontFamily: FF, color: '#FFFFFF',
    background: COLORS.accent, borderRadius: 8, padding: '4px 10px',
    whiteSpace: 'nowrap',
  };

  const btnStyle = (active = false): React.CSSProperties => ({
    width: isMobile ? 38 : 34, height: isMobile ? 38 : 34, borderRadius: 10,
    border: 'none', background: active ? 'rgba(254,128,41,0.2)' : 'rgba(255,255,255,0.08)',
    color: active ? COLORS.accent : '#E5E7EB', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.12s', flexShrink: 0, position: 'relative',
  });

  const dismissBtn: React.CSSProperties = {
    ...btnStyle(), background: 'rgba(255,255,255,0.05)', color: COLORS.grayLight,
  };

  const dangerBtn: React.CSSProperties = {
    ...btnStyle(), color: '#FCA5A5',
  };

  const popover: React.CSSProperties = {
    position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
    background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 12,
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
    padding: 6, minWidth: 180, zIndex: 50,
  };

  const popItem = (label: string, color: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
    borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer',
    width: '100%', textAlign: 'left', fontSize: 12.5, fontWeight: 500, fontFamily: FF, color,
  });

  const closeAll = () => {
    setShowAssign(false); setShowPriority(false); setShowStatus(false);
    setShowTag(false); setShowDueDate(false); setShowProject(false);
  };

  const otherProjects = projects
    ? Object.values(projects).filter(p => p.id !== currentProjectId)
    : [];

  return (
    <div style={bar}>
      <span style={countBadge}>{count} selected</span>
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', margin: '0 3px', flexShrink: 0 }} />

      {/* Complete */}
      <button onClick={onComplete} title="Mark complete" style={btnStyle()}>
        <CheckCircle2 size={isMobile ? 17 : 15} />
      </button>

      {/* Assign */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => { setShowAssign(o => !o); closeAll(); setShowAssign(true); }} title="Assign" style={btnStyle(showAssign)}>
          <UserPlus size={isMobile ? 17 : 15} />
        </button>
        {showAssign && (
          <>
            <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div style={popover}>
              {TEAM.map(m => (
                <button key={m.id} onClick={() => { onBulkAssign(m.id); closeAll(); }} style={popItem(m.name, COLORS.ink)}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: m.color }} />
                  {m.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Priority */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => { closeAll(); setShowPriority(true); }} title="Set priority" style={btnStyle(showPriority)}>
          <Flag size={isMobile ? 17 : 15} />
        </button>
        {showPriority && (
          <>
            <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div style={popover}>
              {Object.entries(PRIORITY_META).map(([k, v]) => (
                <button key={k} onClick={() => { onSetPriority(k); closeAll(); }} style={popItem(v.label, v.color)}>
                  <Flag size={13} color={v.color} />
                  {v.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* #34: Status */}
      {onBulkSetStatus && (
        <div style={{ position: 'relative' }}>
          <button onClick={() => { closeAll(); setShowStatus(true); }} title="Set status" style={btnStyle(showStatus)}>
            <Play size={isMobile ? 17 : 15} />
          </button>
          {showStatus && (
            <>
              <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={popover}>
                {STATUS_ORDER.map(s => (
                  <button key={s} onClick={() => { onBulkSetStatus(s); closeAll(); }} style={popItem(STATUS_META[s].label, STATUS_META[s].color)}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_META[s].color }} />
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* #34: Tag */}
      {onBulkAddTag && tags.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button onClick={() => { closeAll(); setShowTag(true); }} title="Add/remove tag" style={btnStyle(showTag)}>
            <TagIcon size={isMobile ? 17 : 15} />
          </button>
          {showTag && (
            <>
              <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{ ...popover, minWidth: 220 }}>
                <div style={{ padding: '4px 10px 6px', fontSize: 11, fontWeight: 700, color: COLORS.gray, fontFamily: FF, letterSpacing: 0.5 }}>ADD TAG</div>
                {tags.map(tag => (
                  <button key={'a-' + tag.id} onClick={() => { onBulkAddTag(tag.id); closeAll(); }} style={popItem(tag.name, COLORS.ink)}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: tag.color, flexShrink: 0 }} />
                    {tag.name}
                  </button>
                ))}
                <div style={{ height: 1, background: COLORS.line, margin: '4px 0' }} />
                <div style={{ padding: '4px 10px 6px', fontSize: 11, fontWeight: 700, color: COLORS.gray, fontFamily: FF, letterSpacing: 0.5 }}>REMOVE TAG</div>
                {tags.map(tag => (
                  <button key={'r-' + tag.id} onClick={() => { onBulkRemoveTag?.(tag.id); closeAll(); }} style={popItem(tag.name, COLORS.red)}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: tag.color, flexShrink: 0 }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* #34: Due date */}
      {onBulkSetDueDate && (
        <div style={{ position: 'relative' }}>
          <button onClick={() => { closeAll(); setShowDueDate(true); }} title="Set due date" style={btnStyle(showDueDate)}>
            <CalendarDays size={isMobile ? 17 : 15} />
          </button>
          {showDueDate && (
            <>
              <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={popover}>
                <div style={{ padding: '6px 10px' }}>
                  <input
                    autoFocus
                    type="date"
                    onChange={e => { onBulkSetDueDate(e.target.value || null); closeAll(); }}
                    onKeyDown={e => { if (e.key === 'Escape') closeAll(); }}
                    style={{ border: `1.5px solid ${COLORS.line}`, borderRadius: 8, padding: '6px 8px', fontSize: 13, fontFamily: FF, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <button onClick={() => { onBulkSetDueDate(null); closeAll(); }} style={{ ...popItem('Clear due date', COLORS.gray), marginTop: 2 }}>
                  <X size={13} /> Clear due date
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* #34: Move to project */}
      {onBulkMoveToProject && otherProjects.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button onClick={() => { closeAll(); setShowProject(true); }} title="Move to project" style={btnStyle(showProject)}>
            <FolderInput size={isMobile ? 17 : 15} />
          </button>
          {showProject && (
            <>
              <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={popover}>
                {otherProjects.map(p => (
                  <button key={p.id} onClick={() => { onBulkMoveToProject(p.id); closeAll(); }} style={popItem(p.name, COLORS.ink)}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Link / Unlink deps */}
      <button onClick={onLink} title="Link dependencies" style={btnStyle()}>
        <Link2 size={isMobile ? 17 : 15} />
      </button>
      <button onClick={onUnlink} title="Unlink dependencies" style={btnStyle()}>
        <Unlink2 size={isMobile ? 17 : 15} />
      </button>

      {/* Bold */}
      <button onClick={onBold} title="Toggle bold" style={btnStyle()}>
        <Bold size={isMobile ? 17 : 15} />
      </button>

      {/* Milestone */}
      <button onClick={onMilestone} title="Toggle milestone" style={btnStyle()}>
        <Milestone size={isMobile ? 17 : 15} />
      </button>

      {/* #30: Bulk duplicate */}
      {onDuplicateBulk && (
        <button onClick={onDuplicateBulk} title="Duplicate selected" style={btnStyle()}>
          <Copy size={isMobile ? 17 : 15} />
        </button>
      )}

      {/* Attach files */}
      <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) onAttachFiles(e.target.files); e.target.value = ''; }} />
      <button onClick={() => fileRef.current?.click()} title="Attach files" style={btnStyle()}>
        <FileUp size={isMobile ? 17 : 15} />
      </button>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', margin: '0 3px', flexShrink: 0 }} />

      {/* Delete */}
      <button onClick={onDelete} title="Delete" style={dangerBtn}>
        <Trash2 size={isMobile ? 17 : 15} />
      </button>

      {/* Dismiss */}
      <button onClick={onClearSelection} title="Clear selection" style={dismissBtn}>
        <X size={isMobile ? 17 : 15} />
      </button>
    </div>
  );
}
