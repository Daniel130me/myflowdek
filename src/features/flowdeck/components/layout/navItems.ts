'use client';

import {
  LayoutGrid, GanttChartSquare, KanbanSquare, ListChecks, Users, BarChart3,
  ShieldAlert, FolderOpen, BookOpen, Calendar as CalendarIcon, Table2, MoreHorizontal,
  CheckSquare, Link2, Inbox, Target, Zap, FileText, CheckCircle, DollarSign, Clock, Sparkles, BriefcaseBusiness,
} from 'lucide-react';

export const NAV = [
  { id: 'mytasks', label: 'My Tasks', icon: CheckSquare },
  { id: 'talent', label: 'Talent Network', icon: BriefcaseBusiness },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, requiresProject: true },
  { id: 'timeline', label: 'Timeline', icon: GanttChartSquare, requiresProject: true },
  { id: 'board', label: 'Board', icon: KanbanSquare, requiresProject: true },
  { id: 'sheet', label: 'Sheet', icon: Table2, requiresProject: true },
  { id: 'tasks', label: 'Tasks', icon: ListChecks, requiresProject: true },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon, requiresProject: true },
  { id: 'raid', label: 'RAID Log', icon: ShieldAlert, requiresProject: true },
  { id: 'files', label: 'Files', icon: FolderOpen, requiresProject: true },
  { id: 'documents', label: 'Documents', icon: BookOpen, requiresProject: true },
  { id: 'team', label: 'Team', icon: Users, requiresProject: true },
  { id: 'reports', label: 'Reports', icon: BarChart3, requiresProject: true },
  { id: 'deps', label: 'Dependencies', icon: Link2, requiresProject: true },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'automations', label: 'Automations', icon: Zap },
  { id: 'forms', label: 'Forms', icon: FileText },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'timesheets', label: 'Timesheets', icon: Clock },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
];

/**
 * Workspace-level destinations (My Tasks, Inbox, Goals, Automations, ...) are
 * usable without an open project and must stay clickable on /projects.
 * Only truly project-scoped views are disabled until a project is selected
 * (audit H-12: 20 of 22 nav items used to go dead after login).
 */
export function navItemRequiresProject(viewId: string): boolean {
  const item = NAV.find(n => n.id === viewId);
  return Boolean(item && 'requiresProject' in item && item.requiresProject);
}

export const BOTTOM_NAV = [
  { id: 'mytasks', label: 'My Tasks', icon: CheckSquare },
  { id: 'board', label: 'Board', icon: KanbanSquare },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: '_more', label: 'More', icon: MoreHorizontal },
];

export const MORE_NAV = [
  { id: 'talent', label: 'Talent Network', icon: BriefcaseBusiness },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { id: 'sheet', label: 'Sheet', icon: Table2 },
  { id: 'raid', label: 'RAID Log', icon: ShieldAlert },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'documents', label: 'Documents', icon: BookOpen },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'deps', label: 'Dependencies', icon: Link2 },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'automations', label: 'Automations', icon: Zap },
  { id: 'forms', label: 'Forms', icon: FileText },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'timesheets', label: 'Timesheets', icon: Clock },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
];
