'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, ArrowLeft, Calendar, Link2, Diamond, Repeat, Tag as TagIcon, Plus, Trash2, Eye, ExternalLink, Cloud, Copy, FolderInput, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { toast } from 'sonner';
import { COLORS, STATUS_META, PRIORITY_META, TAG_COLORS, fmtRange, fmtDueDate, getDueDateStatus, DUE_STATUS, dueDateOffsetLabel, TODAY, type Task, type FileItem, type Tag, type Comment, type ActivityEntry, type TimeLog, type CustomColumn, type TaskStatus, type TaskPriority, type MemberInfo } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';
import { StatusPill } from '../ui/StatusPill';
import { FileThumbnail } from '../ui/FileThumbnail';
import { Field } from '../ui/Field';
import { SubtasksSection } from '../ui/SubtasksSection';
import { TagPill, TagPills, CommentsSection, FollowersSection, TimeTrackingSection, DuplicateTaskDialog, MarkdownDescription } from '../ui';
import { selectStyle, FF } from '../ui/styles';
import { CloudFilePickerModal } from './CloudFilePickerModal';
import { TaskTalentPanel } from '@/features/talent/TaskTalentPanel';

interface TaskDetailPanelProps {
  task: Task;
  allTasks: Task[];
  files?: FileItem[];
  tags?: Tag[];
  comments?: Comment[];
  activity?: ActivityEntry[];
  parentTask?: Task | null;
  onClose: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onAddSubtask?: (parentId: string) => void;
  onNavigateToTask?: (id: string) => void;
  onToggleTaskTag?: (taskId: string, tagId: string) => void;
  onAddTag?: (tag: Tag) => void;
  onRemoveTag?: (tagId: string) => void;
  onAddComment?: (taskId: string, text: string, parentId?: string | null) => void;
  onDeleteComment?: (commentId: string) => void;
  onEditComment?: (commentId: string, newText: string) => void;
  onToggleReaction?: (commentId: string, emoji: string) => void;
  onToggleFollower?: (taskId: string, userId: string) => void;
  timeLogs?: TimeLog[];
  onAddTimeLog?: (taskId: string, minutes: number, note: string) => void;
  onDeleteTimeLog?: (timeLogId: string) => void;
  currentUserId: string;
  customCols?: CustomColumn[];
  onViewFile?: (fileId: string) => void;
  onRemoveFile?: (fileId: string) => void;
  onAddFiles?: (files: File[]) => void;
  /* #30: Duplicate with options */
  onDuplicateTaskWithOptions?: (id: string, opts: { includeSubtasks: boolean; includeComments: boolean; includeAttachments: boolean }) => void;
  /* #32: Move to project */
  onMoveToProject?: (taskId: string, targetProjectId: string) => void;
  projects?: Record<string, { id: string; name: string; color: string; start: string; end: string }>;
  currentProjectId?: string | null;
  /* #33: Promote / Demote */
  onPromoteSubtask?: (taskId: string) => void;
  onDemoteToSubtask?: (taskId: string, newParentId: string) => void;
  /* #35: Section assignment */
  onSetTaskSection?: (taskId: string, sectionId: string | null) => void;
  sections?: { id: string; name: string }[];
  /** Real project members for the assignee <select>. Sourced from
   *  `useProjectMembers` by the parent. When omitted the select shows an
   *  empty option so the field still renders. */
  members?: MemberInfo[];
}

/* Description field is now in MarkdownDescription.tsx — supports Markdown editing + preview + @mentions */

const TAG_CREATE_COLORS = ['#FE8029', '#0891B2', '#D97706', '#DC2626', '#16A34A', '#7C3AED', '#DB2777', '#6B7280'];

/* Tag picker dropdown with inline create & delete */
function TagPicker({ tags, taskTags, onToggle, onAddTag, onRemoveTag }: { tags: Tag[]; taskTags: string[]; onToggle: (tagId: string) => void; onAddTag?: (tag: Tag) => void; onRemoveTag?: (tagId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_CREATE_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCreate && inputRef.current) inputRef.current.focus();
  }, [showCreate]);

  function handleCreate() {
    const name = newName.trim();
    if (!name || !onAddTag) return;
    const id = 'tag_' + Math.random().toString(36).slice(2, 8);
    onAddTag({ id, name, color: newColor });
    setNewName('');
    setShowCreate(false);
  }

  return (
    <Field label="Tags">
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, background: '#FFFFFF', cursor: 'pointer', textAlign: 'left', fontFamily: FF }}>
          <TagIcon size={14} color={COLORS.gray} />
          {taskTags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
              {taskTags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                if (!tag) return null;
                return <TagPill key={tagId} tag={tag} size="md" />;
              })}
            </div>
          ) : (
            <span style={{ color: COLORS.gray, fontSize: 13 }}>Add tags\u2026</span>
          )}
        </button>
        {open && (
          <>
            <div onClick={() => { setOpen(false); setShowCreate(false); }} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)', zIndex: 50, padding: 6, maxHeight: 280, overflowY: 'auto' }}>
              {tags.map(tag => (
                <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: taskTags.includes(tag.id) ? COLORS.accentSoft : 'transparent' }}>
                  <div onClick={() => onToggle(tag.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${taskTags.includes(tag.id) ? COLORS.accent : COLORS.line}`, background: taskTags.includes(tag.id) ? COLORS.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{taskTags.includes(tag.id) && <span style={{ color: '#FFFFFF', fontSize: 10, lineHeight: 1 }}>&#10003;</span>}</div>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: tag.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontFamily: FF, color: COLORS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag.name}</span>
                  </div>
                  {onRemoveTag && (
                    <button onClick={(e) => { e.stopPropagation(); onRemoveTag(tag.id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.grayLight, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Delete tag"><X size={12} /></button>
                  )}
                </div>
              ))}
              {tags.length === 0 && !showCreate && <div style={{ padding: '8px 12px', fontSize: 12, color: COLORS.gray, fontFamily: FF, textAlign: 'center' }}>No tags yet. Create one below.</div>}
              {showCreate ? (
                <div style={{ padding: '8px', borderTop: `1px solid ${COLORS.line}`, marginTop: 4 }}>
                  <input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowCreate(false); setNewName(''); } }} placeholder="Tag name\u2026" style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${COLORS.accent}`, fontSize: 12.5, fontFamily: FF, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {TAG_CREATE_COLORS.map(c => (
                        <button key={c} onClick={() => setNewColor(c)} style={{ width: 18, height: 18, borderRadius: 6, border: newColor === c ? `2px solid ${COLORS.ink}` : '2px solid transparent', background: c, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setShowCreate(false); setNewName(''); }} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${COLORS.line}`, background: '#FFFFFF', fontSize: 11.5, cursor: 'pointer', fontFamily: FF, color: COLORS.gray }}>Cancel</button>
                      <button onClick={handleCreate} disabled={!newName.trim()} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: newName.trim() ? COLORS.accent : COLORS.line, fontSize: 11.5, fontWeight: 600, cursor: newName.trim() ? 'pointer' : 'not-allowed', fontFamily: FF, color: '#FFFFFF' }}>Create</button>
                    </div>
                  </div>
                </div>
              ) : (
                onAddTag && (
                  <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', color: COLORS.accent, fontSize: 12.5, fontWeight: 600, fontFamily: FF, marginTop: tags.length > 0 ? 2 : 0 }}>
                    <Plus size={14} /> Create new tag
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </Field>
  );
}

export function TaskDetailPanel({ task, allTasks, files = [], tags = [], comments = [], activity = [], parentTask, onClose, onUpdate, onAddSubtask, onNavigateToTask, onToggleTaskTag, onAddTag, onRemoveTag, onAddComment, onDeleteComment, onEditComment, onToggleReaction, onToggleFollower, timeLogs = [], onAddTimeLog, onDeleteTimeLog, currentUserId, customCols, onViewFile, onRemoveFile, onAddFiles, onDuplicateTaskWithOptions, onMoveToProject, projects, currentProjectId, onPromoteSubtask, onDemoteToSubtask, onSetTaskSection, sections = [], members = [] }: TaskDetailPanelProps) {
  const { isMobile } = useViewport();
  const deps = task.deps.map(id => allTasks.find(t => t.id === id)).filter(Boolean) as Task[];
  const taskFiles = files.filter(f => f.linkedTaskId === task.id);
  const dueStatus = getDueDateStatus(task.dueDate, task.status);
  const dueMeta = DUE_STATUS[dueStatus];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showMoveProject, setShowMoveProject] = useState(false);
  const [showDemotePicker, setShowDemotePicker] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [cloudPickerOpen, setCloudPickerOpen] = useState(false);
  const hasSubtasks = allTasks.some(t => t.parentId === task.id);
  const topLevelTasks = allTasks.filter(t => !t.parentId && t.id !== task.id);
  const otherProjects = projects ? Object.values(projects).filter(p => p.id !== currentProjectId) : [];

  /* Shared: files section — interactive with view, open provider, remove, attach */
  function handleOpenProviderFile(f: FileItem, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (f.url) {
      window.open(f.url, '_blank', 'noopener,noreferrer');
    } else if (onViewFile) {
      onViewFile(f.id);
    }
  }

  const filesSection = (
    <Field label={`Attachments (${taskFiles.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {taskFiles.map(f => (
          <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', background: '#F9FAFB', borderRadius: 10, border: `1px solid ${COLORS.line}`, minWidth: 0 }}>
            <FileThumbnail name={f.name} thumbnailUrl={f.thumbnailUrl} size="sm" />
            <span
              onClick={() => onViewFile && onViewFile(f.id)}
              style={{ fontSize: 12.5, fontWeight: 500, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1, cursor: onViewFile ? 'pointer' : 'default', color: onViewFile ? COLORS.teal : COLORS.ink }}
              title={f.name}
            >{f.name}</span>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <button onClick={(e) => handleOpenProviderFile(f, e)} title="Open in Cloud Drive" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ExternalLink size={14} /></button>
              {onViewFile && (
                <button onClick={() => onViewFile(f.id)} title="Preview" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={14} /></button>
              )}
              {onRemoveFile && (
                <button onClick={() => onRemoveFile(f.id)} title="Remove" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.red, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        ))}
        <button
          onClick={() => setCloudPickerOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 10,
            border: `1.5px dashed ${COLORS.accent}`,
            background: COLORS.accentSoft,
            cursor: 'pointer',
            fontFamily: FF,
            fontSize: 12.5,
            fontWeight: 600,
            color: COLORS.accent,
            width: '100%',
          }}
        >
          <Cloud size={14} /> Attach from Cloud Drive
        </button>
      </div>
    </Field>
  );

  /* Shared: parent task field */
  const parentTaskField = parentTask ? (
    <Field label="Parent task">
      <div onClick={() => onNavigateToTask && onNavigateToTask(parentTask.id)} style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, fontSize: 13.5, fontFamily: FF, color: COLORS.teal, cursor: onNavigateToTask ? 'pointer' : 'default', fontWeight: 500 }}>{parentTask.name}</div>
    </Field>
  ) : null;

  /* Shared: subtasks section */
  const subtasksSection = (
    <SubtasksSection taskId={task.id} tasks={allTasks} onOpenTask={id => onNavigateToTask && onNavigateToTask(id)} onAddSubtask={pid => onAddSubtask && onAddSubtask(pid)} />
  );

  /* Shared: due date field */
  const dueDateField = (
    <Field label="Due date">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="date" value={task.dueDate || ''} onChange={e => onUpdate({ dueDate: e.target.value || undefined })} style={{ ...selectStyle, flex: 1 }} />
        {task.dueDate && dueStatus !== 'none' && (
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: FF, padding: '3px 10px', borderRadius: 9999, background: dueMeta.bg, color: dueMeta.color, whiteSpace: 'nowrap' }}>{dueDateOffsetLabel(task.dueDate, task.status)}</span>
        )}
      </div>
    </Field>
  );

  /* Shared: comments section */
  const commentsSection = onAddComment ? (
    <CommentsSection taskId={task.id} comments={comments} activity={activity} onAddComment={onAddComment || (() => {})} onDeleteComment={onDeleteComment || (() => {})} onEditComment={onEditComment} onToggleReaction={onToggleReaction} currentUserId={currentUserId} />
  ) : null;

  /* Shared: followers section */
  const followersSection = onToggleFollower ? (
    <FollowersSection followerIds={task.followers || []} onToggle={(uid) => onToggleFollower(task.id, uid)} currentUserId={currentUserId} members={members} />
  ) : null;

  /* Shared: time tracking section */
  const timeTrackingSection = onAddTimeLog ? (
    <TimeTrackingSection timeLogs={timeLogs} onAdd={(mins, note) => onAddTimeLog(task.id, mins, note)} onDelete={onDeleteTimeLog || (() => {})} />
  ) : null;

  /* Shared: story points field.
   *
   * Story points have no backend API yet — clicking a value would just be
   * dropped by `taskToApiPayload` (it only persists fields that have a
   * corresponding column on the Task table). Surface an info toast instead
   * of silently no-op'ing so the user knows the click didn't persist. */
  const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 21];
  const storyPointsSection = (
    <Field label="Story Points">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {STORY_POINT_OPTIONS.map(sp => (
          <button
            key={sp}
            onClick={() => toast.info('Story points are not yet available')}
            style={{
              width: 38, height: 38, borderRadius: 10,
              border: `2px solid ${task.storyPoints === sp ? COLORS.accent : COLORS.line}`,
              background: task.storyPoints === sp ? COLORS.accentSoft : '#FFFFFF',
              color: task.storyPoints === sp ? COLORS.accent : COLORS.ink,
              fontSize: 14, fontWeight: 700, fontFamily: FF, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >{sp}</button>
        ))}
      </div>
    </Field>
  );

  /* Shared: custom fields section */
  const customFieldsSection = customCols && customCols.length > 0 ? (
    <Field label="Custom Fields">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {customCols.map(col => {
          const val = (task.customFields || {})[col.key] || '';
          const set = (v: string) => onUpdate({ customFields: { ...(task.customFields || {}), [col.key]: v } });
          return (
            <div key={col.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.ink }}>{col.label}</span>
              {col.type === 'number' ? (
                <input type="number" value={val} onChange={e => set(e.target.value)} style={selectStyle} placeholder={`Enter ${col.label.toLowerCase()}`} />
              ) : col.type === 'date' ? (
                <input type="date" value={val} onChange={e => set(e.target.value)} style={selectStyle} />
              ) : (
                <input type="text" value={val} onChange={e => set(e.target.value)} style={selectStyle} placeholder={`Enter ${col.label.toLowerCase()}`} />
              )}
            </div>
          );
        })}
      </div>
    </Field>
  ) : null;

  /* Shared: recurrence picker */
  const recurrenceField = (
    <Field label="Recurrence">
      <select
        value={task.recurrence || ''}
        onChange={e => onUpdate({ recurrence: (e.target.value || undefined) as string | undefined })}
        style={selectStyle}
      >
        <option value="">None</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
    </Field>
  );

  /* Shared: section assignment */
  const sectionField = onSetTaskSection && sections && sections.length > 0 ? (
    <Field label="Section">
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowSectionPicker(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, background: '#FFFFFF', cursor: 'pointer', width: '100%', fontFamily: FF, fontSize: 13, color: task.sectionId ? COLORS.ink : COLORS.gray }}
        >
          {task.sectionId
            ? (sections.find(s => s.id === task.sectionId)?.name || 'Unknown section')
            : 'No section'}
        </button>
        {showSectionPicker && (
          <>
            <div onClick={() => setShowSectionPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', zIndex: 50, padding: 6, maxHeight: 200, overflowY: 'auto' }}>
              <button onClick={() => { onSetTaskSection(task.id, null); setShowSectionPicker(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 12.5, fontFamily: FF, color: !task.sectionId ? COLORS.accent : COLORS.ink }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.gray, flexShrink: 0 }} />
                No section
              </button>
              {sections.map(s => (
                <button key={s.id} onClick={() => { onSetTaskSection(task.id, s.id); setShowSectionPicker(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 12.5, fontFamily: FF, color: task.sectionId === s.id ? COLORS.accent : COLORS.ink }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: task.sectionId === s.id ? COLORS.accent : COLORS.line, flexShrink: 0 }} />
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Field>
  ) : null;

  /* Shared: tags section */
  const tagsSection = onToggleTaskTag ? (
    <TagPicker tags={tags} taskTags={task.tags || []} onToggle={tagId => onToggleTaskTag(task.id, tagId)} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />
  ) : null;

  /* ---- Shared action dialogs (rendered for both mobile and desktop) ---- */
  const actionDialogs = (
    <>
      {showDuplicateDialog && onDuplicateTaskWithOptions && (
        <DuplicateTaskDialog
          taskName={task.name}
          hasSubtasks={hasSubtasks}
          hasComments={comments.length > 0}
          hasAttachments={taskFiles.length > 0}
          onConfirm={(opts) => { onDuplicateTaskWithOptions(task.id, opts); setShowDuplicateDialog(false); }}
          onCancel={() => setShowDuplicateDialog(false)}
        />
      )}
      {/* #32: Move to project dropdown (desktop) */}
      {showMoveProject && onMoveToProject && otherProjects.length > 0 && !isMobile && (
        <>
          <div onClick={() => setShowMoveProject(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', zIndex: 50, padding: 6, minWidth: 220 }}>
            <div style={{ padding: '6px 10px 4px', fontSize: 11, fontWeight: 700, color: COLORS.gray, fontFamily: FF, letterSpacing: 0.5 }}>MOVE TO PROJECT</div>
            {otherProjects.map(p => (
              <button key={p.id} onClick={() => { onMoveToProject(task.id, p.id); setShowMoveProject(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 12.5, fontFamily: FF, color: COLORS.ink }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />{p.name}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );

  /* Mobile: full-screen panel */
  if (isMobile) {
    return (
      <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${COLORS.line}`, background: '#FFFFFF', flexShrink: 0 }}>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.ink, padding: 6, borderRadius: 10, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={20} /></button>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FF, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Task details</span>
          <StatusPill status={task.status} />
          {onDuplicateTaskWithOptions && (
            <button onClick={(e) => { e.stopPropagation(); setShowDuplicateDialog(true); }} title="Duplicate" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}><Copy size={18} /></button>
          )}
          {onMoveToProject && otherProjects.length > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setShowMoveProject(o => !o); }} title="Move to project" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}><FolderInput size={18} /></button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {task.milestone && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: COLORS.accent, background: COLORS.accentSoft, padding: '5px 12px', borderRadius: 9999, fontFamily: FF, marginBottom: 12 }}><Diamond size={10} /> Milestone</span>)}
          {task.recurrence && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: COLORS.teal, background: '#CFFAFE', padding: '5px 12px', borderRadius: 9999, fontFamily: FF, marginBottom: 12, marginLeft: 6, textTransform: 'capitalize' }}><Repeat size={10} /> {task.recurrence}</span>)}
          <h2 style={{ fontFamily: FF, fontSize: 20, marginBottom: 20, lineHeight: 1.3, fontWeight: task.bold ? 800 : 700, letterSpacing: -0.3 }}>{task.name}</h2>
          <MarkdownDescription value={task.description} onUpdate={desc => onUpdate({ description: desc })} />
          {tagsSection}
          {parentTaskField}
          {subtasksSection}
          <Field label="Status"><select value={task.status} onChange={e => onUpdate({ status: e.target.value as TaskStatus, progress: e.target.value === 'done' ? 100 : task.progress })} style={selectStyle}>{['backlog', 'in_progress', 'review', 'done'].map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}</select></Field>
          <Field label="Assignee"><select value={task.assignee} onChange={e => onUpdate({ assignee: e.target.value })} style={selectStyle}>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          <TaskTalentPanel taskId={task.id} />
          <Field label="Priority"><select value={task.priority} onChange={e => onUpdate({ priority: e.target.value as TaskPriority })} style={selectStyle}>{Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          {dueDateField}
          {recurrenceField}
          {sectionField}
          <Field label={`Progress \u2014 ${task.progress}%`}><input type="range" min={0} max={100} step={5} value={task.progress} onChange={e => { const val = Number(e.target.value); onUpdate({ progress: val, status: val === 100 ? 'done' : task.status === 'done' ? 'in_progress' : task.status }); }} style={{ width: '100%', accentColor: COLORS.accent }} /></Field>
          <Field label="Dates"><div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: COLORS.ink, fontFamily: FF }}><Calendar size={16} color={COLORS.gray} /> {fmtRange(task.start, task.duration)} <span style={{ color: COLORS.gray }}>({task.duration}d)</span></div></Field>
          {storyPointsSection}
          {customFieldsSection}
          {deps.length > 0 && (<Field label="Dependencies"><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{deps.map(d => (<div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: FF, padding: '8px 0', borderBottom: `1px solid ${COLORS.line}` }}><Link2 size={14} color={COLORS.gray} /> {d.name}</div>))}</div></Field>)}
          {/* #33: Promote / Demote actions */}
          {task.parentId && onPromoteSubtask && (
            <button onClick={() => onPromoteSubtask(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, background: '#FFFFFF', cursor: 'pointer', width: '100%', fontFamily: FF, fontSize: 13, color: COLORS.ink, marginBottom: 8 }}>
              <ArrowUpCircle size={16} color={COLORS.accent} /> Promote to top-level task
            </button>
          )}
          {!task.parentId && onDemoteToSubtask && topLevelTasks.length > 0 && (
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <button onClick={() => setShowDemotePicker(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, background: '#FFFFFF', cursor: 'pointer', width: '100%', fontFamily: FF, fontSize: 13, color: COLORS.ink }}>
                <ArrowDownCircle size={16} color={COLORS.accent} /> Convert to subtask
              </button>
              {showDemotePicker && (
                <>
                  <div onClick={() => setShowDemotePicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', zIndex: 50, padding: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {topLevelTasks.map(t => (
                      <button key={t.id} onClick={() => { onDemoteToSubtask(task.id, t.id); setShowDemotePicker(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 12.5, fontFamily: FF, color: COLORS.ink }}>{t.name}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {/* #32: Move to project (mobile) */}
          {onMoveToProject && otherProjects.length > 0 && (
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <button onClick={() => setShowMoveProject(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, background: '#FFFFFF', cursor: 'pointer', width: '100%', fontFamily: FF, fontSize: 13, color: COLORS.ink }}>
                <FolderInput size={16} color={COLORS.teal} /> Move to project
              </button>
              {showMoveProject && (
                <>
                  <div onClick={() => setShowMoveProject(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', zIndex: 50, padding: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {otherProjects.map(p => (
                      <button key={p.id} onClick={() => { onMoveToProject(task.id, p.id); setShowMoveProject(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 12.5, fontFamily: FF, color: COLORS.ink }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />{p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {filesSection}
          {timeTrackingSection}
          {followersSection}
          {commentsSection}
        </div>
      </div>
      {actionDialogs}
    </>
    );
  }

  /* Desktop: slide-over panel */
  return (
    <>
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: 'min(440px, 100vw)', background: '#FFFFFF', height: '100%', padding: 22, overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <StatusPill status={task.status} />
            {task.milestone && (<span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: COLORS.accent, background: COLORS.accentSoft, padding: '4px 10px', borderRadius: 9999, fontFamily: FF }}><Diamond size={10} /> Milestone</span>)}
            {task.recurrence && (<span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: COLORS.teal, background: '#CFFAFE', padding: '4px 10px', borderRadius: 9999, fontFamily: FF, textTransform: 'capitalize' }}><Repeat size={10} /> {task.recurrence}</span>)}
            {task.color && <span style={{ width: 14, height: 14, borderRadius: 10, background: task.color }} title="Colour tag" />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {onDuplicateTaskWithOptions && (
              <button onClick={() => setShowDuplicateDialog(true)} title="Duplicate" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}><Copy size={16} /></button>
            )}
            {onMoveToProject && otherProjects.length > 0 && (
              <button onClick={() => setShowMoveProject(o => !o)} title="Move to project" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}><FolderInput size={16} /></button>
            )}
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>
        </div>
        <h2 style={{ fontFamily: FF, fontSize: 18, marginBottom: 16, lineHeight: 1.3, fontWeight: task.bold ? 800 : 700 }}>{task.name}</h2>
        <MarkdownDescription value={task.description} onUpdate={desc => onUpdate({ description: desc })} />
        {tagsSection}
        {parentTaskField}
        {subtasksSection}
        <Field label="Status"><select value={task.status} onChange={e => onUpdate({ status: e.target.value as TaskStatus, progress: e.target.value === 'done' ? 100 : task.progress })} style={selectStyle}>{['backlog', 'in_progress', 'review', 'done'].map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}</select></Field>
        <Field label="Assignee"><select value={task.assignee} onChange={e => onUpdate({ assignee: e.target.value })} style={selectStyle}>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <TaskTalentPanel taskId={task.id} />
        <Field label="Priority"><select value={task.priority} onChange={e => onUpdate({ priority: e.target.value as TaskPriority })} style={selectStyle}>{Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        {dueDateField}
        {recurrenceField}
        {sectionField}
        <Field label={`Progress \u2014 ${task.progress}%`}><input type="range" min={0} max={100} step={5} value={task.progress} onChange={e => { const val = Number(e.target.value); onUpdate({ progress: val, status: val === 100 ? 'done' : task.status === 'done' ? 'in_progress' : task.status }); }} style={{ width: '100%', accentColor: COLORS.accent }} /></Field>
        <Field label="Dates"><div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: COLORS.ink, fontFamily: FF }}><Calendar size={14} color={COLORS.gray} /> {fmtRange(task.start, task.duration)} <span style={{ color: COLORS.gray }}>({task.duration}d)</span></div></Field>
        {storyPointsSection}
        {customFieldsSection}
        {deps.length > 0 && (<Field label="Dependencies"><div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{deps.map(d => (<div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontFamily: FF }}><Link2 size={12} color={COLORS.gray} /> {d.name}</div>))}</div></Field>)}
        {/* #33: Promote / Demote (desktop) */}
        {task.parentId && onPromoteSubtask && (
          <button onClick={() => onPromoteSubtask(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, background: '#FFFFFF', cursor: 'pointer', width: '100%', fontFamily: FF, fontSize: 13, color: COLORS.ink, marginBottom: 8 }}>
            <ArrowUpCircle size={16} color={COLORS.accent} /> Promote to top-level task
          </button>
        )}
        {!task.parentId && onDemoteToSubtask && topLevelTasks.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <button onClick={() => setShowDemotePicker(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, background: '#FFFFFF', cursor: 'pointer', width: '100%', fontFamily: FF, fontSize: 13, color: COLORS.ink }}>
              <ArrowDownCircle size={16} color={COLORS.accent} /> Convert to subtask
            </button>
            {showDemotePicker && (
              <>
                <div onClick={() => setShowDemotePicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', zIndex: 50, padding: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {topLevelTasks.map(t => (
                    <button key={t.id} onClick={() => { onDemoteToSubtask(task.id, t.id); setShowDemotePicker(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 12.5, fontFamily: FF, color: COLORS.ink }}>{t.name}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {filesSection}
        {timeTrackingSection}
        {followersSection}
        {commentsSection}
      </div>
    </div>
    {actionDialogs}
    <CloudFilePickerModal
      projectId={task.projectId}
      taskId={task.id}
      isOpen={cloudPickerOpen}
      onClose={() => setCloudPickerOpen(false)}
      onFileAttached={() => {
        // Trigger parent state refresh if needed
      }}
    />
  </>
  );
}
