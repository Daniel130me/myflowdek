'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup,
  CommandItem, CommandSeparator, CommandShortcut,
} from '@/components/ui/command';
import {
  Search, LayoutDashboard, GanttChart, Kanban, Table2, List, Calendar,
  Shield, FolderOpen, Users, BarChart3, Link2, Inbox, Plus, Undo2, Redo2,
  Sun, Moon, SunMoon, Briefcase, ClipboardList,
} from 'lucide-react';
import { NAV_ITEMS, FF, STATUS_META, PRIORITY_META, TEAM, type Task, type Project } from '@/features/flowdeck/model';

const VIEW_ICONS: Record<string, React.ElementType> = {
  mytasks: ClipboardList, dashboard: LayoutDashboard, timeline: GanttChart,
  board: Kanban, sheet: Table2, tasks: List, calendar: Calendar,
  raid: Shield, files: FolderOpen, team: Users, reports: BarChart3,
  deps: Link2, inbox: Inbox,
};

const STATUS_LIST = Object.entries(STATUS_META);
const PRIORITY_LIST = Object.entries(PRIORITY_META);

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /* navigation */
  activeView: string;
  onNavigate: (view: string) => void;
  /* projects */
  projects: Record<string, Project>;
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  /* tasks */
  tasksByProject: Record<string, Task[]>;
  onOpenTask: (projectId: string, taskId: string) => void;
  onNewTask: (projectId?: string) => void;
  /* actions */
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function CommandPalette({
  open, onOpenChange, activeView, onNavigate,
  projects, onOpenProject, onNewProject,
  tasksByProject, onOpenTask, onNewTask,
  onUndo, onRedo, canUndo, canRedo,
}: CommandPaletteProps) {
  /* Flatten all tasks across projects for search */
  const allTasks = useMemo(() => {
    const list: (Task & { _projectId: string })[] = [];
    for (const [pid, tasks] of Object.entries(tasksByProject)) {
      for (const t of tasks) list.push({ ...t, _projectId: pid });
    }
    return list;
  }, [tasksByProject]);

  const handleSelect = useCallback((action: () => void) => {
    action();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." style={{ fontFamily: FF }} />
      <CommandList style={{ maxHeight: 420 }}>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* ---- Actions ---- */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => handleSelect(onNewTask)}>
            <Plus style={{ width: 16, height: 16 }} />
            <span style={{ fontFamily: FF }}>New Task</span>
            <CommandShortcut>c</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(onNewProject)}>
            <Briefcase style={{ width: 16, height: 16 }} />
            <span style={{ fontFamily: FF }}>New Project</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(onUndo)} disabled={!canUndo}>
            <Undo2 style={{ width: 16, height: 16 }} />
            <span style={{ fontFamily: FF }}>Undo</span>
            <CommandShortcut>⌘Z</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(onRedo)} disabled={!canRedo}>
            <Redo2 style={{ width: 16, height: 16 }} />
            <span style={{ fontFamily: FF }}>Redo</span>
            <CommandShortcut>⌘⇧Z</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ---- Views ---- */}
        <CommandGroup heading="Views">
          {NAV_ITEMS.map(v => {
            const Icon = VIEW_ICONS[v.id] || List;
            const isActive = activeView === v.id;
            return (
              <CommandItem key={v.id} onSelect={() => handleSelect(() => onNavigate(v.id))}>
                <Icon style={{ width: 16, height: 16 }} />
                <span style={{ fontFamily: FF }}>{v.label}</span>
                {isActive && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6B7280', fontFamily: FF }}>current</span>}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        {/* ---- Projects ---- */}
        <CommandGroup heading="Projects">
          {Object.values(projects).map(p => (
            <CommandItem key={p.id} onSelect={() => handleSelect(() => onOpenProject(p.id))}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
              <span style={{ fontFamily: FF }}>{p.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* ---- Tasks ---- */}
        {allTasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {allTasks.slice(0, 8).map(t => {
              const member = TEAM.find(m => m.id === t.assignee);
              const proj = projects[t._projectId];
              return (
                <CommandItem key={t.id} onSelect={() => handleSelect(() => {
                  onOpenTask(t._projectId, t.id);
                })}>
                  <span style={{ fontFamily: FF, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </span>
                  {proj && (
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: FF, flexShrink: 0 }}>
                      {proj.name}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
