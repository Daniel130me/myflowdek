'use client';

import React from 'react';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator, ContextMenuSub,
  ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuCheckboxItem,
  ContextMenuShortcut, ContextMenuLabel,
} from '@/components/ui/context-menu';
import {
  Trash2, Copy, CheckSquare, Square, Flag,
  ArrowUpCircle, ArrowDownCircle, Tag as TagIcon, Play, Eye, FolderInput, ArrowRightToLine, Repeat, LayoutList,
} from 'lucide-react';
import { STATUS_META, STATUS_ORDER, PRIORITY_META, COLORS, FF, type Task, type Tag, type Project, type TaskStatus, type TaskPriority } from '@/features/flowdeck/model';

interface TaskContextMenuProps {
  task: Task;
  tags?: Tag[];
  projects?: Record<string, Project>;
  currentProjectId?: string | null;
  children: React.ReactNode;
  /* actions */
  onOpenTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask?: (id: string) => void;
  onToggleTag?: (taskId: string, tagId: string) => void;
  /* #32: Move to project */
  onMoveToProject?: (taskId: string, targetProjectId: string) => void;
  /* #33: Promote / Demote */
  onPromoteSubtask?: (taskId: string) => void;
  onDemoteToSubtask?: (taskId: string, newParentId: string) => void;
  allTasks?: Task[];
  /* #31: Recurrence */
  onSetRecurrence?: (taskId: string, recurrence: string | undefined) => void;
  /* #35: Sections */
  sections?: { id: string; name: string }[];
  onSetTaskSection?: (taskId: string, sectionId: string | null) => void;
}

export function TaskContextMenu({
  task, tags = [], projects, currentProjectId, children,
  onOpenTask, onToggleComplete, onUpdateTask, onDeleteTask, onDuplicateTask, onToggleTag,
  onMoveToProject, onPromoteSubtask, onDemoteToSubtask, allTasks = [],
  onSetRecurrence, sections = [], onSetTaskSection,
}: TaskContextMenuProps) {
  const isDone = task.status === 'done';
  const isSubtask = !!task.parentId;
  const otherProjects = projects
    ? Object.values(projects).filter(p => p.id !== currentProjectId)
    : [];
  const topLevelTasks = allTasks.filter(t => !t.parentId && t.id !== task.id);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent style={{ fontFamily: FF, minWidth: 210, zIndex: 9999 }}>
        <ContextMenuItem onSelect={() => onOpenTask(task.id)}>
          <Eye style={{ width: 15, height: 15 }} />
          Open task
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem onSelect={() => onToggleComplete(task.id)}>
          {isDone
            ? <><Square style={{ width: 15, height: 15 }} /> Reopen task</>
            : <><CheckSquare style={{ width: 15, height: 15 }} /> Mark complete</>
          }
          <ContextMenuShortcut>Space</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Status submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Play style={{ width: 15, height: 15 }} />
            Change status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent style={{ fontFamily: FF, minWidth: 160 }}>
            {STATUS_ORDER.map(s => {
              const meta = STATUS_META[s];
              return (
                <ContextMenuItem
                  key={s}
                  onSelect={() => onUpdateTask(task.id, { status: s as TaskStatus, progress: s === 'done' ? 100 : s === 'backlog' ? 0 : task.progress })}
                  disabled={task.status === s}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, marginRight: 4 }} />
                  {meta.label}
                  {task.status === s && <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray }}>✓</span>}
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Priority submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Flag style={{ width: 15, height: 15 }} />
            Set priority
          </ContextMenuSubTrigger>
          <ContextMenuSubContent style={{ fontFamily: FF, minWidth: 140 }}>
            {Object.entries(PRIORITY_META).map(([key, meta]) => (
              <ContextMenuItem
                key={key}
                onSelect={() => onUpdateTask(task.id, { priority: key as TaskPriority })}
                disabled={task.priority === key}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, marginRight: 4 }} />
                {meta.label}
                {task.priority === key && <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray }}>✓</span>}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Tags submenu */}
        {onToggleTag && tags.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <TagIcon style={{ width: 15, height: 15 }} />
              Toggle tag
            </ContextMenuSubTrigger>
            <ContextMenuSubContent style={{ fontFamily: FF, minWidth: 160 }}>
              {tags.map(tag => {
                const isActive = (task.tags || []).includes(tag.id);
                return (
                  <ContextMenuCheckboxItem
                    key={tag.id}
                    checked={isActive}
                    onCheckedChange={() => onToggleTag(task.id, tag.id)}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: tag.color, marginRight: 4 }} />
                    {tag.name}
                  </ContextMenuCheckboxItem>
                );
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        {/* #31: Set recurrence */}
        {onSetRecurrence && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Repeat style={{ width: 15, height: 15 }} />
              Set recurrence
            </ContextMenuSubTrigger>
            <ContextMenuSubContent style={{ fontFamily: FF, minWidth: 160 }}>
              <ContextMenuItem onSelect={() => onSetRecurrence(task.id, undefined)} disabled={!task.recurrence}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.gray, marginRight: 4 }} />
                None
                {!task.recurrence && <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray }}>✓</span>}
              </ContextMenuItem>
              {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                <ContextMenuItem key={freq} onSelect={() => onSetRecurrence(task.id, freq)} disabled={task.recurrence === freq}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.teal, marginRight: 4 }} />
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  {task.recurrence === freq && <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray }}>✓</span>}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {/* #35: Move to section */}
        {onSetTaskSection && sections.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <LayoutList style={{ width: 15, height: 15 }} />
              Move to section
            </ContextMenuSubTrigger>
            <ContextMenuSubContent style={{ fontFamily: FF, minWidth: 180, maxHeight: 240, overflowY: 'auto' }}>
              <ContextMenuItem onSelect={() => onSetTaskSection(task.id, null)} disabled={!task.sectionId}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.gray, marginRight: 4 }} />
                No section
                {!task.sectionId && <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray }}>✓</span>}
              </ContextMenuItem>
              {sections.map(s => (
                <ContextMenuItem key={s.id} onSelect={() => onSetTaskSection(task.id, s.id)} disabled={task.sectionId === s.id}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.accent, marginRight: 4 }} />
                  {s.name}
                  {task.sectionId === s.id && <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray }}>✓</span>}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        {/* #33: Promote / Demote */}
        {isSubtask && onPromoteSubtask && (
          <ContextMenuItem onSelect={() => onPromoteSubtask(task.id)}>
            <ArrowUpCircle style={{ width: 15, height: 15 }} />
            Promote to top-level
          </ContextMenuItem>
        )}
        {!isSubtask && onDemoteToSubtask && topLevelTasks.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ArrowDownCircle style={{ width: 15, height: 15 }} />
              Convert to subtask
            </ContextMenuSubTrigger>
            <ContextMenuSubContent style={{ fontFamily: FF, minWidth: 200, maxHeight: 240, overflowY: 'auto' }}>
              {topLevelTasks.map(t => (
                <ContextMenuItem key={t.id} onSelect={() => onDemoteToSubtask(task.id, t.id)}>
                  <ArrowRightToLine style={{ width: 14, height: 14, marginRight: 4 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {/* #32: Move to project */}
        {onMoveToProject && otherProjects.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FolderInput style={{ width: 15, height: 15 }} />
              Move to project
            </ContextMenuSubTrigger>
            <ContextMenuSubContent style={{ fontFamily: FF, minWidth: 180 }}>
              {otherProjects.map(p => (
                <ContextMenuItem key={p.id} onSelect={() => onMoveToProject(task.id, p.id)}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, marginRight: 6, flexShrink: 0 }} />
                  {p.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        {onDuplicateTask && (
          <ContextMenuItem onSelect={() => onDuplicateTask(task.id)}>
            <Copy style={{ width: 15, height: 15 }} />
            Duplicate task
            <ContextMenuShortcut>⌘D</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        <ContextMenuItem variant="destructive" onSelect={() => onDeleteTask(task.id)}>
          <Trash2 style={{ width: 15, height: 15 }} />
          Delete task
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
