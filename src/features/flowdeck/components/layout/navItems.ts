'use client';

import {
  LayoutGrid, GanttChartSquare, KanbanSquare, ListChecks, Users, BarChart3,
  ShieldAlert, FolderOpen, BookOpen, Calendar as CalendarIcon, Table2, MoreHorizontal,
  CheckSquare, Link2, Inbox, Target, Zap, FileText, CheckCircle, DollarSign, Clock, Sparkles, BriefcaseBusiness,
} from 'lucide-react';

export const NAV = [
  { id: 'mytasks', label: 'My Tasks', icon: CheckSquare },
  { id: 'talent', label: 'Talent Network', icon: BriefcaseBusiness },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { id: 'board', label: 'Board', icon: KanbanSquare },
  { id: 'sheet', label: 'Sheet', icon: Table2 },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
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

/**
 * Views that only make sense inside an open project (audit H-12). Everything
 * else in NAV is workspace-level and must stay clickable before a project is
 * opened — the old blanket rule disabled 20 of 22 nav items right after login
 * with no explanation.
 */
const PROJECT_SCOPED_VIEWS = new Set([
  'dashboard', 'timeline', 'board', 'sheet', 'tasks', 'calendar',
  'raid', 'files', 'documents', 'team', 'reports', 'deps',
]);

export function isNavItemDisabled(itemId: string, hasProject: boolean): boolean {
  return !hasProject && PROJECT_SCOPED_VIEWS.has(itemId);
}
