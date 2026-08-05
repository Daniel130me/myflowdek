'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import {
  STATUS_META, PRIORITY_META, TEAM, TODAY,
  INITIAL_PROJECTS, initialTasks, initialFiles, initialRaid,
  INITIAL_TAGS, initialComments, initialTimeLogs, MEMBER_CAPACITY, CURRENT_USER_ID,
  PROJECT_TEMPLATES,
  FONT_FAMILY as FF,
  type Task, type Project, type FileItem, type RaidItem, type CustomColumn,
  type Tag, type Comment, type ActivityEntry, type TimeLog, type SearchFilters, type Section, type Reaction, type Goal, type KeyResult, type SavedFilter, EMPTY_FILTERS,
  type AutomationRule, type Form, type FormSubmission, type ApprovalRequest, type Budget, type Expense, type TimesheetEntry,
} from '@/features/flowdeck/model';
import type { GridActions } from '../components/toolbar/types';
import type { ProjectStatusUpdate } from '@/features/flowdeck/model';
import { useOptionalFlowdekData } from '@/providers/FlowdekDataProvider';

/* ---- LocalStorage persistence ---- */
const STORAGE_KEY = 'flowdeck-state-v1';
const SAVE_DEBOUNCE = 500;

function loadPersistedState(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function initFromStorage<T>(key: string, fallback: T, persisted: Record<string, unknown> | null): T {
  if (persisted && key in persisted) return persisted[key] as T;
  return fallback;
}

/* ---- Recurrence date helper ---- */
function computeNextDate(dateStr: string, recurrence: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  switch (recurrence) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    default: return dateStr;
  }
  return d.toISOString().slice(0, 10);
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export interface FlowDeckState {
  /* Projects & data */
  projects: Record<string, Project>;
  tasksByProject: Record<string, Task[]>;
  filesByProject: Record<string, FileItem[]>;
  raidByProject: Record<string, RaidItem[]>;
  customColsByProject: Record<string, CustomColumn[]>;
  tagsByProject: Record<string, Tag[]>;
  commentsByProject: Record<string, Comment[]>;
  activityByProject: Record<string, ActivityEntry[]>;
  currentUserId: string;

  /* UI state */
  currentProjectId: string | null;
  activeView: string;
  selectedTaskId: string | null;
  selectedIds: Set<string>;
  searchQuery: string;
  showNewTask: boolean;
  showNewProject: boolean;
  projectMenuOpen: boolean;
  shareOpen: boolean;
  sidebarOpen: boolean;
  moreMenuOpen: boolean;
  durationUnit: string;
  viewingFileId: string | null;
  setViewingFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveView: React.Dispatch<React.SetStateAction<string>>;
  setSelectedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setShowNewTask: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNewProject: React.Dispatch<React.SetStateAction<boolean>>;
  setProjectMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShareOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  searchFilters: SearchFilters;
  setSearchFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  activeFilterCount: number;
  clearFilters: () => void;

  /* History */
  clipboard: { items: Task[]; mode: string | null };
  past: Record<string, Task[]>[];
  future: Record<string, Task[]>[];

  /* Derived */
  project: Project | null;
  tasks: Task[];
  files: FileItem[];
  raidItems: RaidItem[];
  customCols: CustomColumn[];
  filteredTasks: Task[];
  selectedTask: Task | null;
  viewingFile: FileItem | null;
  tags: Tag[];
  taskComments: Comment[];
  taskActivity: ActivityEntry[];
  gridActions: GridActions;

  /* Actions */
  openProject: (id: string) => void;
  goToPortfolio: () => void;
  createProject: (p: { name: string; color: string; start: string; end: string }) => void;
  createProjectFromTemplate: (templateId: string, name: string, color: string, start: string, end: string) => void;
  deleteProject: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  addTask: (task: Task) => void;
  removeTask: (id: string) => void;
  removeTasksBulk: (ids: Set<string>) => void;
  duplicateTask: (id: string) => void;
  moveStatus: (id: string, status: string) => void;
  toggleComplete: (id: string) => void;
  addFiles: (files: FileItem[]) => void;
  removeFile: (id: string) => void;
  linkFile: (id: string, linkedTaskId: string | null) => void;
  addRaidItem: (item: RaidItem) => void;
  updateRaidItem: (id: string, patch: Partial<RaidItem>) => void;
  removeRaidItem: (id: string) => void;
  addColumn: (def: CustomColumn) => void;
  removeColumn: (key: string) => void;
  openFileViewer: (fileId: string) => void;
  /* Tags */
  addTag: (tag: Tag) => void;
  removeTag: (tagId: string) => void;
  toggleTaskTag: (taskId: string, tagId: string) => void;
  /* Comments */
  addComment: (taskId: string, text: string, parentId?: string | null) => void;
  deleteComment: (commentId: string) => void;
  editComment: (commentId: string, newText: string) => void;
  toggleReaction: (commentId: string, emoji: string) => void;
  /* Followers */
  toggleFollower: (taskId: string, userId: string) => void;
  /* Time Logs */
  timeLogs: TimeLog[];
  taskTimeLogs: TimeLog[];
  addTimeLog: (taskId: string, minutes: number, note: string) => void;
  deleteTimeLog: (timeLogId: string) => void;
  /* Reorder & Quick Add */
  reorderTask: (taskId: string, toIndex: number) => void;
  quickAddTask: (name: string, opts?: { status?: string; parentId?: string | null; startOverride?: string }) => string | undefined;
  /* Batch 6 */
  duplicateTaskWithOptions: (id: string, opts: { includeSubtasks: boolean; includeComments: boolean; includeAttachments: boolean }) => void;
  duplicateTasksBulk: (ids: Set<string>) => void;
  moveTaskToProject: (taskId: string, targetProjectId: string) => void;
  moveTasksToProjectBulk: (ids: Set<string>, targetProjectId: string) => void;
  promoteSubtask: (taskId: string) => void;
  demoteToSubtask: (taskId: string, newParentId: string) => void;
  bulkSetDueDate: (ids: Set<string>, date: string | null) => void;
  bulkAddTag: (ids: Set<string>, tagId: string) => void;
  bulkRemoveTag: (ids: Set<string>, tagId: string) => void;
  bulkSetStatus: (ids: Set<string>, status: string) => void;
  /* #35: Sections */
  sections: Section[];
  addSection: (name: string) => void;
  renameSection: (sectionId: string, name: string) => void;
  deleteSection: (sectionId: string) => void;
  toggleSectionCollapsed: (sectionId: string) => void;
  reorderSection: (sectionId: string, toIndex: number) => void;
  setTaskSection: (taskId: string, sectionId: string | null) => void;
  /* Batch 7: Project management */
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  toggleProjectFavorite: (projectId: string) => void;
  archiveProject: (projectId: string) => void;
  restoreProject: (projectId: string) => void;
  setProjectMembers: (projectId: string, members: string[]) => void;
  projectStatusUpdates: ProjectStatusUpdate[];
  addProjectStatusUpdate: (text: string, color: 'green' | 'yellow' | 'red') => void;
  deleteProjectStatusUpdate: (id: string) => void;
  saveProjectAsTemplate: (name: string, includeTasks: boolean) => void;
  /* #47: Goals / OKRs */
  goals: Goal[];
  keyResults: KeyResult[];
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addKeyResult: (kr: KeyResult) => void;
  updateKeyResult: (id: string, patch: Partial<KeyResult>) => void;
  deleteKeyResult: (id: string) => void;
  /* #49: Saved Filters */
  savedFilters: SavedFilter[];
  saveFilter: (name: string, filters: SearchFilters) => void;
  deleteSavedFilter: (id: string) => void;
  renameSavedFilter: (id: string, name: string) => void;
  toggleSavedFilterPin: (id: string) => void;
  applySavedFilter: (id: string) => void;
  /* Automations */
  automations: AutomationRule[];
  addAutomation: (rule: AutomationRule) => void;
  updateAutomation: (id: string, patch: Partial<AutomationRule>) => void;
  deleteAutomation: (id: string) => void;
  executeAutomation: (taskId: string, triggerType: string, newValue: string, projectId: string) => void;
  /* Forms */
  forms: Form[];
  submissions: FormSubmission[];
  addForm: (form: Form) => void;
  updateForm: (id: string, patch: Partial<Form>) => void;
  deleteForm: (id: string) => void;
  addSubmission: (submission: FormSubmission) => void;
  /* Approvals */
  approvals: ApprovalRequest[];
  addApproval: (approval: ApprovalRequest) => void;
  resolveApproval: (id: string, approved: boolean, comment?: string) => void;
  deleteApproval: (id: string) => void;
  /* Budget & Expense */
  budgets: Budget[];
  expenses: Expense[];
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  /* Timesheets */
  timesheets: TimesheetEntry[];
  addTimesheetEntry: (entry: TimesheetEntry) => void;
  updateTimesheetEntry: (id: string, patch: Partial<TimesheetEntry>) => void;
  deleteTimesheetEntry: (id: string) => void;
}

export function useFlowDeckStore(): FlowDeckState {
  /* ---- Hydration-safe initial state (useEffect will load from localStorage) ---- */
  const persistedRef = useRef<Record<string, unknown> | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [projects, setProjects] = useState<Record<string, Project>>(INITIAL_PROJECTS);
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>(initialTasks);
  const [filesByProject, setFilesByProject] = useState<Record<string, FileItem[]>>(initialFiles);
  const [raidByProject, setRaidByProject] = useState<Record<string, RaidItem[]>>(initialRaid);
  const [customColsByProject, setCustomColsByProject] = useState<Record<string, CustomColumn[]>>({ p1: [], p2: [] });
  const [tagsByProject, setTagsByProject] = useState<Record<string, Tag[]>>(INITIAL_TAGS);
  const [commentsByProject, setCommentsByProject] = useState<Record<string, Comment[]>>(initialComments);

  /* Load persisted state on mount */
  useEffect(() => {
    const persisted = loadPersistedState();
    persistedRef.current = persisted;
    if (persisted) {
      if (persisted.projects) setProjects(persisted.projects as Record<string, Project>);
      if (persisted.tasksByProject) setTasksByProject(persisted.tasksByProject as Record<string, Task[]>);
      if (persisted.filesByProject) setFilesByProject(persisted.filesByProject as Record<string, FileItem[]>);
      if (persisted.raidByProject) setRaidByProject(persisted.raidByProject as Record<string, RaidItem[]>);
      if (persisted.customColsByProject) setCustomColsByProject(persisted.customColsByProject as Record<string, CustomColumn[]>);
      if (persisted.tagsByProject) setTagsByProject(persisted.tagsByProject as Record<string, Tag[]>);
      if (persisted.commentsByProject) setCommentsByProject(persisted.commentsByProject as Record<string, Comment[]>);
      if (persisted.activityByProject) setActivityByProject(persisted.activityByProject as Record<string, ActivityEntry[]>);
      if (persisted.timeLogsByProject) setTimeLogsByProject(persisted.timeLogsByProject as Record<string, TimeLog[]>);
      if (persisted.sectionsByProject) setSectionsByProject(persisted.sectionsByProject as Record<string, Section[]>);
      if (persisted.statusUpdatesByProject) setStatusUpdatesByProject(persisted.statusUpdatesByProject as Record<string, ProjectStatusUpdate[]>);
      if (persisted.goals) setGoals(persisted.goals as Goal[]);
      if (persisted.keyResults) setKeyResults(persisted.keyResults as KeyResult[]);
      if (persisted.savedFilters) setSavedFilters(persisted.savedFilters as SavedFilter[]);
      if (persisted.automations) setAutomations(persisted.automations as AutomationRule[]);
      if (persisted.forms) setForms(persisted.forms as Form[]);
      if (persisted.submissions) setSubmissions(persisted.submissions as FormSubmission[]);
      if (persisted.approvals) setApprovals(persisted.approvals as ApprovalRequest[]);
      if (persisted.budgets) setBudgets(persisted.budgets as Budget[]);
      if (persisted.expenses) setExpenses(persisted.expenses as Expense[]);
      if (persisted.timesheets) setTimesheets(persisted.timesheets as TimesheetEntry[]);
      if (persisted.currentProjectId) setCurrentProjectId(persisted.currentProjectId as string | null);
      if (persisted.activeView) setActiveView(persisted.activeView as string);
    }
    setHydrated(true);
  }, []);

  const [activityByProject, setActivityByProject] = useState<Record<string, ActivityEntry[]>>({
    p1: [
      { id: 'a1', taskId: 't1', type: 'completed', description: 'Wale Johnson marked as done', authorId: 'u5', timestamp: '2026-07-05T16:00:00' },
      { id: 'a2', taskId: 't2', type: 'completed', description: 'Ada Coker marked as done', authorId: 'u1', timestamp: '2026-07-04T18:00:00' },
      { id: 'a3', taskId: 't3', type: 'completed', description: 'Ada Coker marked as done', authorId: 'u1', timestamp: '2026-07-11T17:00:00' },
      { id: 'a4', taskId: 't4', type: 'status_change', description: 'Wale Johnson changed status to In Progress', authorId: 'u5', timestamp: '2026-07-08T09:00:00' },
      { id: 'a5', taskId: 't6', type: 'status_change', description: 'Ada Coker changed status to In Progress', authorId: 'u1', timestamp: '2026-07-18T09:00:00' },
      { id: 'a6', taskId: 't6a', type: 'completed', description: 'Ada Coker marked as done', authorId: 'u1', timestamp: '2026-07-19T17:00:00' },
      { id: 'a7', taskId: 't6b', type: 'completed', description: 'Ada Coker marked as done', authorId: 'u1', timestamp: '2026-07-21T16:00:00' },
    ],
    p2: [
      { id: 'a8', taskId: 'm1', type: 'status_change', description: 'Wale Johnson changed status to In Progress', authorId: 'u5', timestamp: '2026-08-03T09:00:00' },
    ],
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('projects');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [durationUnit, setDurationUnit] = useState('days');
  const [clipboard, setClipboard] = useState<{ items: Task[]; mode: string | null }>({ items: [], mode: null });
  const [past, setPast] = useState<Record<string, Task[]>[]>([]);
  const [future, setFuture] = useState<Record<string, Task[]>[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [timeLogsByProject, setTimeLogsByProject] = useState<Record<string, TimeLog[]>>(initialTimeLogs);
  const [sectionsByProject, setSectionsByProject] = useState<Record<string, Section[]>>({});
  const [statusUpdatesByProject, setStatusUpdatesByProject] = useState<Record<string, ProjectStatusUpdate[]>>({
    p1: [
      { id: 'su1', projectId: 'p1', authorId: 'u5', text: 'Design phase on track. Stakeholder interviews complete, wireframes approved. Moving into development sprint next week.', color: 'green', createdAt: '2026-07-15T10:00:00' },
    ],
  });

  /* #47: Goals & Key Results */
  const [goals, setGoals] = useState<Goal[]>([  
    { id: 'g1', title: 'Improve Website Performance', status: 'on_track', startDate: '2026-07-01', endDate: '2026-09-30', linkedProjectIds: ['p1'] },
    { id: 'g2', title: 'Launch Mobile App MVP', status: 'at_risk', startDate: '2026-08-01', endDate: '2026-12-31', linkedProjectIds: ['p2'] },
  ]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([
    { id: 'kr1', goalId: 'g1', title: 'Reduce page load time to under 2 seconds', targetValue: 2, currentValue: 3.5, unit: 'seconds' },
    { id: 'kr2', goalId: 'g1', title: 'Achieve 90+ Lighthouse performance score', targetValue: 90, currentValue: 72, unit: 'score' },
    { id: 'kr3', goalId: 'g1', title: 'Zero critical accessibility issues', targetValue: 0, currentValue: 3, unit: 'issues' },
    { id: 'kr4', goalId: 'g2', title: 'Complete core user flows', targetValue: 5, currentValue: 2, unit: 'flows' },
    { id: 'kr5', goalId: 'g2', title: 'Pass App Store review', targetValue: 1, currentValue: 0, unit: 'submission' },
  ]);

  /* #49: Saved Filters */
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  /* Automations */
  const [automations, setAutomations] = useState<AutomationRule[]>([
    { id: 'auto-1', name: 'Auto-move to Review', enabled: true, createdAt: new Date().toISOString(),
      trigger: { type: 'status_change', value: 'inprogress' },
      actions: [{ type: 'add_comment', value: 'Task moved to In Progress — review when ready.' }] },
    { id: 'auto-2', name: 'Escalate overdue tasks', enabled: true, createdAt: new Date().toISOString(),
      trigger: { type: 'due_date_approaching', daysBefore: 0 },
      actions: [{ type: 'set_priority', value: 'high' }] },
  ]);

  /* Forms */
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);

  /* Approvals */
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);

  /* Budget & Expense */
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  /* Timesheets */
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);

  /* Batch 7: derived */
  const projectStatusUpdates = currentProjectId ? (statusUpdatesByProject[currentProjectId] || []) : [];

  /* Debounced save to localStorage (must come after all state declarations) */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const state = {
          projects, tasksByProject, filesByProject, raidByProject,
          customColsByProject, tagsByProject, commentsByProject, activityByProject,
          timeLogsByProject, sectionsByProject, statusUpdatesByProject,
          goals, keyResults, savedFilters, currentProjectId, activeView,
          automations, forms, submissions, approvals, budgets, expenses, timesheets,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch { /* storage full or private mode */ }
    }, SAVE_DEBOUNCE);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [hydrated, projects, tasksByProject, filesByProject, raidByProject, customColsByProject, tagsByProject, commentsByProject, activityByProject, timeLogsByProject, sectionsByProject, statusUpdatesByProject, goals, keyResults, savedFilters, currentProjectId, activeView, automations, forms, submissions, approvals, budgets, expenses, timesheets]);

  const project = currentProjectId ? projects[currentProjectId] : null;
  const tasks = currentProjectId ? (tasksByProject[currentProjectId] || []) : [];
  const files = currentProjectId ? (filesByProject[currentProjectId] || []) : [];
  const raidItems = currentProjectId ? (raidByProject[currentProjectId] || []) : [];
  const customCols = currentProjectId ? (customColsByProject[currentProjectId] || []) : [];
  const tags = currentProjectId ? (tagsByProject[currentProjectId] || []) : [];
  const taskComments = currentProjectId ? (commentsByProject[currentProjectId] || []) : [];
  const taskActivity = currentProjectId ? (activityByProject[currentProjectId] || []) : [];
  const timeLogs = currentProjectId ? (timeLogsByProject[currentProjectId] || []) : [];
  const taskTimeLogs = selectedTaskId ? timeLogs.filter(tl => tl.taskId === selectedTaskId) : [];
  const sections = currentProjectId ? (sectionsByProject[currentProjectId] || []) : [];
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (searchFilters.assignees.length) c++;
    if (searchFilters.statuses.length) c++;
    if (searchFilters.priorities.length) c++;
    if (searchFilters.tags.length) c++;
    if (searchFilters.dueBefore) c++;
    if (searchFilters.dueAfter) c++;
    return c;
  }, [searchFilters]);

  const clearFilters = useCallback(() => setSearchFilters(EMPTY_FILTERS), []);

  const openProject = useCallback((id: string) => {
    setCurrentProjectId(id);
    setActiveView('dashboard');
    setProjectMenuOpen(false);
    setSelectedTaskId(null);
    setSelectedIds(new Set());
    setSidebarOpen(false);
  }, []);

  const goToPortfolio = useCallback(() => {
    setActiveView('projects');
    setProjectMenuOpen(false);
    setSidebarOpen(false);
  }, []);

  const createProject = useCallback(({ name, color, start, end }: { name: string; color: string; start: string; end: string }) => {
    const id = 'p' + Math.random().toString(36).slice(2, 8);
    setProjects(prev => ({ ...prev, [id]: { id, name, color, start, end } }));
    setTasksByProject(prev => ({ ...prev, [id]: [] }));
    setFilesByProject(prev => ({ ...prev, [id]: [] }));
    setRaidByProject(prev => ({ ...prev, [id]: [] }));
    setCustomColsByProject(prev => ({ ...prev, [id]: [] }));
    setTagsByProject(prev => ({ ...prev, [id]: [] }));
    setStatusUpdatesByProject(prev => ({ ...prev, [id]: [] }));
    setCommentsByProject(prev => ({ ...prev, [id]: [] }));
    setActivityByProject(prev => ({ ...prev, [id]: [] }));
    setTimeLogsByProject(prev => ({ ...prev, [id]: [] }));
    setSectionsByProject(prev => ({ ...prev, [id]: [] }));
    setShowNewProject(false);
    openProject(id);
    toast.success('Project created', { description: name });
  }, [openProject]);

  const createProjectFromTemplate = useCallback((templateId: string, name: string, color: string, start: string, end: string) => {
    const tpl = PROJECT_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    const id = 'p' + Math.random().toString(36).slice(2, 8);
    const templateTasks = tpl.generateTasks(id, start);
    const templateTags: Tag[] = tpl.tags.map((t, i) => ({ id: `tag_${id}_${i}`, name: t.name, color: t.color }));
    setProjects(prev => ({ ...prev, [id]: { id, name, color, start, end } }));
    setTasksByProject(prev => ({ ...prev, [id]: templateTasks }));
    setFilesByProject(prev => ({ ...prev, [id]: [] }));
    setRaidByProject(prev => ({ ...prev, [id]: [] }));
    setCustomColsByProject(prev => ({ ...prev, [id]: tpl.customCols }));
    setTagsByProject(prev => ({ ...prev, [id]: templateTags }));
    setCommentsByProject(prev => ({ ...prev, [id]: [] }));
    setActivityByProject(prev => ({ ...prev, [id]: [] }));
    setTimeLogsByProject(prev => ({ ...prev, [id]: [] }));
    setSectionsByProject(prev => ({ ...prev, [id]: [] }));
    setShowNewProject(false);
    openProject(id);
    toast.success('Project created from template', { description: name });
  }, [openProject]);

  const deleteProject = useCallback((id: string) => {
    const projName = projects[id]?.name || 'Project';
    if (!confirm(`Delete "${projName}"? This removes all its tasks, files, and logs.`)) return;
    setProjects(prev => { const n = { ...prev }; delete n[id]; return n; });
    setTasksByProject(prev => { const n = { ...prev }; delete n[id]; return n; });
    setFilesByProject(prev => { const n = { ...prev }; delete n[id]; return n; });
    setRaidByProject(prev => { const n = { ...prev }; delete n[id]; return n; });
    setCustomColsByProject(prev => { const n = { ...prev }; delete n[id]; return n; });
    setTagsByProject(prev => { const n = { ...prev }; delete n[id]; return n; });
    setCommentsByProject(prev => { const n = { ...prev }; delete n[id]; return n; });
    setActivityByProject(prev => { const n = { ...prev }; delete n[id]; return n; });
    setTimeLogsByProject(prev => { const n = { ...prev }; delete n[id]; return n; });
    setSectionsByProject(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (currentProjectId === id) { setCurrentProjectId(null); setActiveView('projects'); }
    toast.success('Project deleted', { description: projName });
  }, [projects, currentProjectId]);

  /* ---- activity logging ---- */
  const logActivity = useCallback((taskId: string, type: ActivityEntry['type'], description: string) => {
    if (!currentProjectId) return;
    const entry: ActivityEntry = {
      id: 'a' + Math.random().toString(36).slice(2, 8),
      taskId, type, description,
      authorId: CURRENT_USER_ID,
      timestamp: new Date().toISOString(),
    };
    setActivityByProject(prev => ({
      ...prev,
      [currentProjectId]: [...(prev[currentProjectId] || []), entry],
    }));
  }, [currentProjectId]);

  /* ---- history-tracked task mutation ---- */
  const commit = useCallback((nextTasksForProject: Task[]) => {
    setPast(p => [...p.slice(-49), tasksByProject]);
    setFuture([]);
    if (currentProjectId) setTasksByProject(prev => ({ ...prev, [currentProjectId]: nextTasksForProject }));
  }, [tasksByProject, currentProjectId]);

  const undo = useCallback(() => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setFuture(f => [tasksByProject, ...f]);
    setTasksByProject(prev);
    setPast(p => p.slice(0, -1));
  }, [past, tasksByProject]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const next = future[0];
    setPast(p => [...p, tasksByProject]);
    setTasksByProject(next);
    setFuture(f => f.slice(1));
  }, [future, tasksByProject]);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    const task = tasks.find(t => t.id === id);
    commit(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
    if (task && patch.status && patch.status !== task.status) {
      const member = TEAM.find(m => m.id === CURRENT_USER_ID);
      logActivity(id, 'status_change', `${member?.name || 'Someone'} changed status to ${STATUS_META[patch.status]?.label || patch.status}`);
    }
    if (task && patch.priority && patch.priority !== task.priority) {
      const member = TEAM.find(m => m.id === CURRENT_USER_ID);
      logActivity(id, 'priority_change', `${member?.name || 'Someone'} changed priority to ${PRIORITY_META[patch.priority]?.label || patch.priority}`);
    }
    if (task && patch.dueDate && patch.dueDate !== task.dueDate) {
      const member = TEAM.find(m => m.id === CURRENT_USER_ID);
      logActivity(id, 'due_date_change', `${member?.name || 'Someone'} changed due date`);
    }
  }, [tasks, commit, logActivity]);

  const toggleComplete = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const member = TEAM.find(m => m.id === CURRENT_USER_ID);
    if (task.status === 'done') {
      commit(tasks.map(t => t.id === id ? { ...t, status: 'inprogress', progress: 0 } : t));
      logActivity(id, 'reopened', `${member?.name || 'Someone'} reopened this task`);
      toast.info('Task reopened', { description: task.name });
    } else {
      /* ---- Recurring task: create next instance ---- */
      if (task.recurrence) {
        const nextDue = task.dueDate ? computeNextDate(task.dueDate, task.recurrence) : undefined;
        const nextStart = nextDue || task.start;
        const newId = 't' + Math.random().toString(36).slice(2, 8);
        const nextTask: Task = {
          id: newId,
          name: task.name,
          description: task.description,
          status: 'backlog',
          assignee: task.assignee,
          start: nextStart,
          duration: task.duration,
          dueDate: nextDue,
          progress: 0,
          priority: task.priority,
          deps: [],
          tags: task.tags ? [...task.tags] : undefined,
          followers: task.followers ? [...task.followers] : undefined,
          recurrence: task.recurrence,
          customFields: task.customFields ? { ...task.customFields } : undefined,
          storyPoints: task.storyPoints,
          bold: task.bold,
          color: task.color,
          milestone: task.milestone,
          createdAt: new Date().toISOString(),
        };
        /* Mark current done AND add next instance in one commit */
        commit([
          ...tasks.map(t => t.id === id ? { ...t, status: 'done', progress: 100 } : t),
          nextTask,
        ]);
        logActivity(id, 'completed', `${member?.name || 'Someone'} marked as done (recurring — next instance created)`);
        toast.success('Task completed — next instance created', { description: task.name });
      } else {
        commit(tasks.map(t => t.id === id ? { ...t, status: 'done', progress: 100 } : t));
        logActivity(id, 'completed', `${member?.name || 'Someone'} marked as done`);
        toast.success('Task completed', { description: task.name });
      }
    }
  }, [tasks, commit, logActivity]);

  const updateTasksBulk = useCallback((ids: Set<string>, patch: Partial<Task> | ((t: Task) => Partial<Task>)) => {
    commit(tasks.map(t => ids.has(t.id) ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t));
  }, [tasks, commit]);

  const addTask = useCallback((newTask: Task) => {
    commit([...tasks, newTask]);
    logActivity(newTask.id, 'created', `Task "${newTask.name}" was created`);
    toast.success('Task created', { description: newTask.name });
  }, [tasks, commit, logActivity]);
  const addTasksBulk = useCallback((newTasks: Task[]) => { commit([...tasks, ...newTasks]); }, [tasks, commit]);

  const moveStatus = useCallback((id: string, status: string) => {
    const progress = status === 'done' ? 100 : status === 'backlog' ? 0 : undefined;
    updateTask(id, progress === undefined ? { status } : { status, progress });
  }, [updateTask]);

  const removeTask = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    const descendantIds = new Set<string>();
    const collectDescendants = (parentId: string) => {
      for (const t of tasks) {
        if (t.parentId === parentId && !descendantIds.has(t.id)) {
          descendantIds.add(t.id);
          collectDescendants(t.id);
        }
      }
    };
    descendantIds.add(id);
    collectDescendants(id);
    commit(tasks.filter(t => !descendantIds.has(t.id)));
    setSelectedIds(prev => { const n = new Set(prev); for (const did of descendantIds) n.delete(did); return n; });
    toast.success('Task deleted', { description: task?.name || 'Task' });
  }, [tasks, commit]);

  const removeTasksBulk = useCallback((ids: Set<string>) => {
    const count = ids.size;
    commit(tasks.filter(t => !ids.has(t.id)));
    setSelectedIds(new Set());
    toast.success(`${count} task${count > 1 ? 's' : ''} deleted`);
  }, [tasks, commit]);

  const indentSelected = useCallback(() => updateTasksBulk(selectedIds, t => ({ level: Math.min(4, (t.level || 0) + 1) })), [selectedIds, updateTasksBulk]);
  const outdentSelected = useCallback(() => updateTasksBulk(selectedIds, t => ({ level: Math.max(0, (t.level || 0) - 1) })), [selectedIds, updateTasksBulk]);
  const linkSelected = useCallback(() => {
    const ordered = tasks.filter(t => selectedIds.has(t.id));
    if (ordered.length < 2) return;
    const next = tasks.map(t => ({ ...t, deps: [...t.deps] }));
    for (let i = 1; i < ordered.length; i++) {
      const successor = next.find(t => t.id === ordered[i].id);
      const predId = ordered[i - 1].id;
      if (successor && !successor.deps.includes(predId)) successor.deps.push(predId);
    }
    commit(next);
  }, [selectedIds, tasks, commit]);
  const unlinkSelected = useCallback(() => {
    commit(tasks.map(t => selectedIds.has(t.id) ? { ...t, deps: t.deps.filter(d => !selectedIds.has(d)) } : t));
  }, [selectedIds, tasks, commit]);
  const bulkAssign = useCallback((memberId: string) => updateTasksBulk(selectedIds, { assignee: memberId }), [selectedIds, updateTasksBulk]);
  const setRecurrenceSelected = useCallback((freq: string | null) => updateTasksBulk(selectedIds, { recurrence: freq }), [selectedIds, updateTasksBulk]);
  const toggleBoldSelected = useCallback(() => {
    const anyBold = tasks.some(t => selectedIds.has(t.id) && t.bold);
    updateTasksBulk(selectedIds, { bold: !anyBold });
  }, [selectedIds, tasks, updateTasksBulk]);
  const setColorSelected = useCallback((color: string | null) => updateTasksBulk(selectedIds, { color }), [selectedIds, updateTasksBulk]);
  const toggleMilestoneSelected = useCallback(() => {
    const anyMilestone = tasks.some(t => selectedIds.has(t.id) && t.milestone);
    updateTasksBulk(selectedIds, { milestone: !anyMilestone });
  }, [selectedIds, tasks, updateTasksBulk]);
  const copySelected = useCallback(() => setClipboard({ items: tasks.filter(t => selectedIds.has(t.id)).map(t => ({ ...t })), mode: 'copy' }), [selectedIds, tasks]);
  const cutSelected = useCallback(() => {
    setClipboard({ items: tasks.filter(t => selectedIds.has(t.id)).map(t => ({ ...t })), mode: 'cut' });
    removeTasksBulk(selectedIds);
  }, [selectedIds, tasks, removeTasksBulk]);
  const paste = useCallback(() => {
    if (!clipboard.items.length) return;
    const clones = clipboard.items.map(t => ({ ...t, id: 't' + Math.random().toString(36).slice(2, 8), name: t.name + ' (copy)' }));
    addTasksBulk(clones);
  }, [clipboard.items, addTasksBulk]);

  const importCSV = useCallback((file: File) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as Record<string, string>[]).map(r => {
          const member = TEAM.find(m => m.name.toLowerCase() === (r.assignee || '').toLowerCase());
          return { id: 't' + Math.random().toString(36).slice(2, 8), name: r.name || 'Untitled task', description: r.description || undefined, assignee: member ? member.id : TEAM[0].id, start: r.start || TODAY.toISOString().slice(0, 10), duration: Number(r.duration) || 3, progress: Number(r.progress) || 0, priority: PRIORITY_META[r.priority] ? r.priority : 'medium', status: STATUS_META[r.status] ? r.status : 'backlog', deps: [] } as Task;
        });
        if (rows.length) addTasksBulk(rows);
      },
    });
  }, [addTasksBulk]);

  const exportCSV = useCallback(() => {
    if (!project) return;
    const csv = Papa.unparse(tasks.map(t => ({ name: t.name, description: t.description || '', assignee: TEAM.find(m => m.id === t.assignee)?.name || '', start: t.start, due_date: t.dueDate || '', duration: t.duration, progress: t.progress, priority: t.priority, status: t.status, tags: (t.tags || []).join(', ') })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${project.name.replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [tasks, project]);

  const attachFilesToSelected = useCallback((fileList: FileList) => {
    if (!selectedIds.size || !currentProjectId) return;
    const targetId = [...selectedIds][0];
    const now = TODAY.toISOString().slice(0, 10);
    const newFiles = Array.from(fileList).map(f => ({ id: 'f' + Math.random().toString(36).slice(2, 8), name: f.name, size: f.size, uploadedBy: CURRENT_USER_ID, uploadedAt: now, linkedTaskId: targetId, url: URL.createObjectURL(f) }));
    setFilesByProject(prev => ({ ...prev, [currentProjectId]: [...newFiles, ...(prev[currentProjectId] || [])] }));
  }, [selectedIds, currentProjectId]);

  const addColumn = useCallback((def: CustomColumn) => {
    if (!currentProjectId) return;
    setCustomColsByProject(prev => ({ ...prev, [currentProjectId]: [...(prev[currentProjectId] || []), def] }));
  }, [currentProjectId]);

  const removeColumn = useCallback((key: string) => {
    if (!currentProjectId) return;
    setCustomColsByProject(prev => ({ ...prev, [currentProjectId]: (prev[currentProjectId] || []).filter(c => c.key !== key) }));
  }, [currentProjectId]);

  const addFiles = useCallback((newFiles: FileItem[]) => {
    if (!currentProjectId) return;
    setFilesByProject(prev => ({ ...prev, [currentProjectId]: [...newFiles, ...(prev[currentProjectId] || [])] }));
  }, [currentProjectId]);

  const removeFile = useCallback((id: string) => {
    if (!currentProjectId) return;
    setFilesByProject(prev => ({ ...prev, [currentProjectId]: (prev[currentProjectId] || []).filter(f => f.id !== id) }));
  }, [currentProjectId]);

  const linkFile = useCallback((id: string, linkedTaskId: string | null) => {
    if (!currentProjectId) return;
    setFilesByProject(prev => ({ ...prev, [currentProjectId]: (prev[currentProjectId] || []).map(f => f.id === id ? { ...f, linkedTaskId } : f) }));
  }, [currentProjectId]);

  const addRaidItem = useCallback((item: RaidItem) => {
    if (!currentProjectId) return;
    setRaidByProject(prev => ({ ...prev, [currentProjectId]: [item, ...(prev[currentProjectId] || [])] }));
  }, [currentProjectId]);

  const updateRaidItem = useCallback((id: string, patch: Partial<RaidItem>) => {
    if (!currentProjectId) return;
    setRaidByProject(prev => ({ ...prev, [currentProjectId]: (prev[currentProjectId] || []).map(r => r.id === id ? { ...r, ...patch } : r) }));
  }, [currentProjectId]);

  const removeRaidItem = useCallback((id: string) => {
    if (!currentProjectId) return;
    setRaidByProject(prev => ({ ...prev, [currentProjectId]: (prev[currentProjectId] || []).filter(r => r.id !== id) }));
  }, [currentProjectId]);

  /* ---- Tags ---- */
  const addTag = useCallback((tag: Tag) => {
    if (!currentProjectId) return;
    setTagsByProject(prev => ({ ...prev, [currentProjectId]: [...(prev[currentProjectId] || []), tag] }));
    toast.success('Tag created', { description: tag.name });
  }, [currentProjectId]);

  const removeTag = useCallback((tagId: string) => {
    if (!currentProjectId) return;
    const tag = tags.find(t => t.id === tagId);
    setTagsByProject(prev => ({ ...prev, [currentProjectId]: (prev[currentProjectId] || []).filter(t => t.id !== tagId) }));
    commit(tasks.map(t => ({ ...t, tags: (t.tags || []).filter(tid => tid !== tagId) })));
    toast.success('Tag removed', { description: tag?.name || 'Tag' });
  }, [currentProjectId, tasks, commit, tags]);

  const toggleTaskTag = useCallback((taskId: string, tagId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const currentTags = task.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    commit(tasks.map(t => t.id === taskId ? { ...t, tags: newTags } : t));
    const tag = tags.find(tg => tg.id === tagId);
    if (tag) logActivity(taskId, currentTags.includes(tagId) ? 'tag_removed' : 'tag_added', `Tag "${tag.name}" ${currentTags.includes(tagId) ? 'removed from' : 'added to'} task`);
  }, [tasks, commit, tags, logActivity]);

  /* ---- Reorder ---- */
  const reorderTask = useCallback((taskId: string, toIndex: number) => {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1 || idx === toIndex) return;
    const arr = [...tasks];
    const [removed] = arr.splice(idx, 1);
    arr.splice(toIndex, 0, removed);
    commit(arr);
  }, [tasks, commit]);

  /* ---- Quick Add ---- */
  const quickAddTask = useCallback((name: string, opts?: { status?: string; parentId?: string | null; startOverride?: string }) => {
    if (!name.trim()) return;
    const id = 't' + Math.random().toString(36).slice(2, 8);
    const todayStr = TODAY.toISOString().slice(0, 10);
    const newTask: Task = {
      id,
      name: name.trim(),
      status: opts?.status || 'backlog',
      assignee: CURRENT_USER_ID,
      start: opts?.startOverride || todayStr,
      duration: 3,
      progress: 0,
      priority: 'medium',
      deps: [],
      parentId: opts?.parentId || null,
      createdAt: new Date().toISOString(),
    };
    commit([...tasks, newTask]);
    logActivity(id, 'created', `Task "${newTask.name}" was created`);
    return id;
  }, [tasks, commit, logActivity]);

  /* ---- Comments ---- */
  const addComment = useCallback((taskId: string, text: string, parentId?: string | null) => {
    if (!currentProjectId || !text.trim()) return;
    const comment: Comment = {
      id: 'c' + Math.random().toString(36).slice(2, 8),
      taskId,
      authorId: CURRENT_USER_ID,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      parentId: parentId || null,
      reactions: [],
    };
    setCommentsByProject(prev => ({
      ...prev,
      [currentProjectId]: [...(prev[currentProjectId] || []), comment],
    }));
    const member = TEAM.find(m => m.id === CURRENT_USER_ID);
    logActivity(taskId, 'comment', `${member?.name || 'Someone'} ${parentId ? 'replied' : 'commented'}`);
  }, [currentProjectId, logActivity]);

  const deleteComment = useCallback((commentId: string) => {
    if (!currentProjectId) return;
    /* Also delete replies to this comment */
    setCommentsByProject(prev => {
      const comments = prev[currentProjectId] || [];
      const idsToDelete = new Set<string>();
      idsToDelete.add(commentId);
      /* Collect all descendant reply IDs (only 1 level deep per spec) */
      comments.forEach(c => { if (c.parentId && idsToDelete.has(c.parentId)) idsToDelete.add(c.id); });
      return {
        ...prev,
        [currentProjectId]: comments.filter(c => !idsToDelete.has(c.id)),
      };
    });
  }, [currentProjectId]);

  const editComment = useCallback((commentId: string, newText: string) => {
    if (!currentProjectId || !newText.trim()) return;
    setCommentsByProject(prev => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).map(c =>
        c.id === commentId ? { ...c, text: newText.trim(), edited: true } : c
      ),
    }));
  }, [currentProjectId]);

  const toggleReaction = useCallback((commentId: string, emoji: string) => {
    if (!currentProjectId) return;
    setCommentsByProject(prev => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).map(c => {
        if (c.id !== commentId) return c;
        const reactions = [...(c.reactions || [])];
        const existing = reactions.find(r => r.emoji === emoji);
        if (existing) {
          if (existing.userIds.includes(CURRENT_USER_ID)) {
            /* Remove user from reaction */
            const newUserIds = existing.userIds.filter(u => u !== CURRENT_USER_ID);
            if (newUserIds.length === 0) {
              return { ...c, reactions: reactions.filter(r => r.emoji !== emoji) };
            }
            return { ...c, reactions: reactions.map(r => r.emoji === emoji ? { ...r, userIds: newUserIds } : r) };
          } else {
            /* Add user to existing reaction */
            return { ...c, reactions: reactions.map(r => r.emoji === emoji ? { ...r, userIds: [...r.userIds, CURRENT_USER_ID] } : r) };
          }
        } else {
          /* Create new reaction */
          return { ...c, reactions: [...reactions, { emoji, userIds: [CURRENT_USER_ID] }] };
        }
      }),
    }));
  }, [currentProjectId]);

  /* ---- Followers ---- */
  const toggleFollower = useCallback((taskId: string, userId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const current = task.followers || [];
    const newFollowers = current.includes(userId)
      ? current.filter(u => u !== userId)
      : [...current, userId];
    commit(tasks.map(t => t.id === taskId ? { ...t, followers: newFollowers } : t));
    const member = TEAM.find(m => m.id === userId);
    const memberName = member?.name || 'Someone';
    logActivity(taskId, 'comment', `${memberName} ${current.includes(userId) ? 'stopped following' : 'is now following'} this task`);
  }, [tasks, commit, logActivity]);

  /* ---- Time Logs ---- */
  const addTimeLog = useCallback((taskId: string, minutes: number, note: string) => {
    if (!currentProjectId || minutes <= 0) return;
    const entry: TimeLog = {
      id: 'tl' + Math.random().toString(36).slice(2, 8),
      taskId, userId: CURRENT_USER_ID, minutes, note: note.trim(),
      loggedAt: new Date().toISOString(),
    };
    setTimeLogsByProject(prev => ({
      ...prev,
      [currentProjectId]: [...(prev[currentProjectId] || []), entry],
    }));
  }, [currentProjectId]);

  const deleteTimeLog = useCallback((timeLogId: string) => {
    if (!currentProjectId) return;
    setTimeLogsByProject(prev => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).filter(tl => tl.id !== timeLogId),
    }));
  }, [currentProjectId]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;
  const viewingFile = files.find(f => f.id === viewingFileId) || null;

  const openFileViewer = useCallback((fileId: string) => {
    setViewingFileId(fileId);
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    /* Text search */
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        TEAM.find(m => m.id === t.assignee)?.name.toLowerCase().includes(q)
      );
    }
    /* Structured filters */
    const f = searchFilters;
    if (f.assignees.length) result = result.filter(t => f.assignees.includes(t.assignee));
    if (f.statuses.length) result = result.filter(t => f.statuses.includes(t.status));
    if (f.priorities.length) result = result.filter(t => f.priorities.includes(t.priority));
    if (f.tags.length) result = result.filter(t => (t.tags || []).some(tagId => f.tags.includes(tagId)));
    const dueBefore = f.dueBefore;
    const dueAfter = f.dueAfter;
    if (dueBefore) result = result.filter(t => Boolean(t.dueDate && t.dueDate <= dueBefore));
    if (dueAfter) result = result.filter(t => Boolean(t.dueDate && t.dueDate >= dueAfter));
    return result;
  }, [tasks, searchQuery, searchFilters]);

  const gridActions: GridActions = useMemo(() => ({
    selectedIds, setSelectedIds,
    onAddTask: () => setShowNewTask(true),
    onBulkAssign: bulkAssign,
    onSetRecurrence: setRecurrenceSelected,
    onUndo: undo, onRedo: redo, canUndo: past.length > 0, canRedo: future.length > 0,
    onIndent: indentSelected, onOutdent: outdentSelected,
    onLink: linkSelected, onUnlink: unlinkSelected,
    onDeleteSelected: () => removeTasksBulk(selectedIds),
    onToggleBold: toggleBoldSelected,
    onSetColor: setColorSelected,
    durationUnit, onToggleDurationUnit: () => setDurationUnit(u => u === 'days' ? 'hours' : 'days'),
    onToggleMilestone: toggleMilestoneSelected,
    onImportCSV: importCSV, onExportCSV: exportCSV, onPrint: () => window.print(),
    onCut: cutSelected, onCopy: copySelected, onPaste: paste, canPaste: clipboard.items.length > 0,
    onAttachFiles: attachFilesToSelected,
    customCols, onAddColumn: addColumn, onRemoveColumn: removeColumn,
    onOpenShare: () => setShareOpen(true),
  }), [selectedIds, bulkAssign, setRecurrenceSelected, undo, redo, past.length, future.length,
    indentSelected, outdentSelected, linkSelected, unlinkSelected, removeTasksBulk,
    toggleBoldSelected, setColorSelected, durationUnit, toggleMilestoneSelected,
    importCSV, exportCSV, cutSelected, copySelected, paste, clipboard.items,
    attachFilesToSelected, customCols, addColumn, removeColumn]);

  /* ---- #30: Duplicate task with options ---- */
  const duplicateTaskWithOptions = useCallback((id: string, opts?: { includeSubtasks?: boolean; includeComments?: boolean; includeAttachments?: boolean }) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newId = 't' + Math.random().toString(36).slice(2, 8);
    const idMap = new Map<string, string>();
    idMap.set(id, newId);

    const cloneBase: Task = {
      ...task,
      id: newId,
      name: task.name + ' (copy)',
      status: 'backlog',
      progress: 0,
      deps: [],
      tags: [...(task.tags || [])],
      followers: [...(task.followers || [])],
      customFields: task.customFields ? { ...task.customFields } : undefined,
      createdAt: new Date().toISOString(),
    };

    let newTasks: Task[] = [cloneBase];

    /* Deep clone subtasks */
    if (opts?.includeSubtasks) {
      const subtasks = tasks.filter(t => t.parentId === id);
      for (const sub of subtasks) {
        const subId = 't' + Math.random().toString(36).slice(2, 8);
        idMap.set(sub.id, subId);
        newTasks.push({
          ...sub,
          id: subId,
          parentId: newId,
          name: sub.name + ' (copy)',
          status: 'backlog',
          progress: 0,
          deps: [],
          tags: [...(sub.tags || [])],
          followers: [...(sub.followers || [])],
          customFields: sub.customFields ? { ...sub.customFields } : undefined,
          createdAt: new Date().toISOString(),
        });
      }
    }

    commit([...tasks, ...newTasks]);

    /* Deep clone comments */
    if (opts?.includeComments && currentProjectId) {
      const taskComments = (commentsByProject[currentProjectId] || []).filter(c => c.taskId === id);
      if (taskComments.length) {
        const clonedComments = taskComments.map(c => ({
          id: 'c' + Math.random().toString(36).slice(2, 8),
          taskId: newId,
          authorId: c.authorId,
          text: c.text,
          createdAt: new Date().toISOString(),
        }));
        setCommentsByProject(prev => ({
          ...prev,
          [currentProjectId]: [...(prev[currentProjectId] || []), ...clonedComments],
        }));
      }
    }

    /* Deep clone attachments (file links only — can't clone blob URLs) */
    if (opts?.includeAttachments && currentProjectId) {
      const taskFiles = (filesByProject[currentProjectId] || []).filter(f => f.linkedTaskId === id);
      if (taskFiles.length) {
        const clonedFiles = taskFiles.map(f => ({
          ...f,
          id: 'f' + Math.random().toString(36).slice(2, 8),
          linkedTaskId: newId,
        }));
        setFilesByProject(prev => ({
          ...prev,
          [currentProjectId]: [...(prev[currentProjectId] || []), ...clonedFiles],
        }));
      }
    }

    logActivity(newId, 'created', `Task "${cloneBase.name}" was created`);
    toast.success('Task duplicated', { description: cloneBase.name });
  }, [tasks, commit, logActivity, currentProjectId, commentsByProject, filesByProject]);

  /* Keep simple duplicateTask as a thin wrapper */
  const duplicateTask = useCallback((id: string) => duplicateTaskWithOptions(id), [duplicateTaskWithOptions]);

  /* Bulk duplicate selected tasks */
  const duplicateTasksBulk = useCallback((ids: Set<string>) => {
    let newTasks: Task[] = [];
    for (const id of ids) {
      const task = tasks.find(t => t.id === id);
      if (!task) continue;
      newTasks.push({
        ...task,
        id: 't' + Math.random().toString(36).slice(2, 8),
        name: task.name + ' (copy)',
        status: 'backlog', progress: 0, deps: [],
        tags: [...(task.tags || [])],
        followers: [...(task.followers || [])],
        customFields: task.customFields ? { ...task.customFields } : undefined,
        createdAt: new Date().toISOString(),
      });
    }
    if (newTasks.length) {
      commit([...tasks, ...newTasks]);
      toast.success(`${newTasks.length} task${newTasks.length > 1 ? 's' : ''} duplicated`);
    }
  }, [tasks, commit]);

  /* ---- #32: Move task to another project ---- */
  const moveTaskToProject = useCallback((taskId: string, targetProjectId: string) => {
    if (!currentProjectId || targetProjectId === currentProjectId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    /* Collect task + all subtasks */
    const idsToMove = new Set<string>();
    const collectDescendants = (parentId: string) => {
      for (const t of tasks) {
        if (t.parentId === parentId && !idsToMove.has(t.id)) {
          idsToMove.add(t.id);
          collectDescendants(t.id);
        }
      }
    };
    idsToMove.add(taskId);
    collectDescendants(taskId);
    const tasksToMove = tasks.filter(t => idsToMove.has(t.id));

    /* Remove from current project */
    setTasksByProject(prev => ({ ...prev, [currentProjectId]: (prev[currentProjectId] || []).filter(t => !idsToMove.has(t.id)) }));
    /* Add to target project */
    setTasksByProject(prev => ({ ...prev, [targetProjectId]: [...(prev[targetProjectId] || []), ...tasksToMove] }));
    /* Move associated comments */
    const commentsToMove = (commentsByProject[currentProjectId] || []).filter(c => idsToMove.has(c.taskId));
    if (commentsToMove.length) {
      setCommentsByProject(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || []).filter(c => !idsToMove.has(c.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...commentsToMove],
      }));
    }
    /* Move associated activity */
    const activityToMove = (activityByProject[currentProjectId] || []).filter(a => idsToMove.has(a.taskId));
    if (activityToMove.length) {
      setActivityByProject(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || []).filter(a => !idsToMove.has(a.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...activityToMove],
      }));
    }
    /* Move associated time logs */
    const timeLogsToMove = (timeLogsByProject[currentProjectId] || []).filter(tl => idsToMove.has(tl.taskId));
    if (timeLogsToMove.length) {
      setTimeLogsByProject(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || []).filter(tl => !idsToMove.has(tl.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...timeLogsToMove],
      }));
    }
    /* Move associated files */
    const filesToMove = (filesByProject[currentProjectId] || []).filter(f => idsToMove.has(f.linkedTaskId || ''));
    if (filesToMove.length) {
      setFilesByProject(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || []).filter(f => !idsToMove.has(f.linkedTaskId || '')),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...filesToMove],
      }));
    }
    /* Clear selection if moved task was selected */
    if (selectedIds.has(taskId)) {
      setSelectedIds(prev => { const n = new Set(prev); for (const did of idsToMove) n.delete(did); return n; });
    }
    if (selectedTaskId === taskId) setSelectedTaskId(null);

    const targetName = projects[targetProjectId]?.name || 'Project';
    toast.success(`Moved to ${targetName}`, { description: task.name });
  }, [tasks, currentProjectId, selectedIds, selectedTaskId, commentsByProject, activityByProject, timeLogsByProject, filesByProject, projects]);

  /* Bulk move selected tasks to another project */
  const moveTasksToProjectBulk = useCallback((ids: Set<string>, targetProjectId: string) => {
    if (!currentProjectId || targetProjectId === currentProjectId) return;
    const tasksToMove = tasks.filter(t => ids.has(t.id));
    if (!tasksToMove.length) return;

    setTasksByProject(prev => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).filter(t => !ids.has(t.id)),
      [targetProjectId]: [...(prev[targetProjectId] || []), ...tasksToMove],
    }));

    const commentsToMove = (commentsByProject[currentProjectId] || []).filter(c => ids.has(c.taskId));
    if (commentsToMove.length) {
      setCommentsByProject(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || []).filter(c => !ids.has(c.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...commentsToMove],
      }));
    }
    const activityToMove = (activityByProject[currentProjectId] || []).filter(a => ids.has(a.taskId));
    if (activityToMove.length) {
      setActivityByProject(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || []).filter(a => !ids.has(a.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...activityToMove],
      }));
    }
    const timeLogsToMove = (timeLogsByProject[currentProjectId] || []).filter(tl => ids.has(tl.taskId));
    if (timeLogsToMove.length) {
      setTimeLogsByProject(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || []).filter(tl => !ids.has(tl.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...timeLogsToMove],
      }));
    }
    const filesToMove = (filesByProject[currentProjectId] || []).filter(f => ids.has(f.linkedTaskId || ''));
    if (filesToMove.length) {
      setFilesByProject(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || []).filter(f => !ids.has(f.linkedTaskId || '')),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...filesToMove],
      }));
    }
    setSelectedIds(new Set());
    const targetName = projects[targetProjectId]?.name || 'Project';
    toast.success(`${ids.size} task${ids.size > 1 ? 's' : ''} moved to ${targetName}`);
  }, [tasks, currentProjectId, commentsByProject, activityByProject, timeLogsByProject, filesByProject, projects]);

  /* ---- #33: Promote subtask to top-level ---- */
  const promoteSubtask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.parentId) return;
    const newLevel = Math.max(0, (task.level || 1) - 1);
    commit(tasks.map(t => t.id === taskId ? { ...t, parentId: null, level: newLevel } : t));
    const member = TEAM.find(m => m.id === CURRENT_USER_ID);
    logActivity(taskId, 'created', `${member?.name || 'Someone'} promoted subtask to top-level`);
    toast.success('Subtask promoted', { description: task.name });
  }, [tasks, commit, logActivity]);

  /* ---- #33: Demote task to subtask ---- */
  const demoteToSubtask = useCallback((taskId: string, newParentId: string) => {
    if (taskId === newParentId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newLevel = Math.min(4, (task.level || 0) + 1);
    commit(tasks.map(t => t.id === taskId ? { ...t, parentId: newParentId, level: newLevel } : t));
    const parentTask = tasks.find(t => t.id === newParentId);
    const member = TEAM.find(m => m.id === CURRENT_USER_ID);
    logActivity(taskId, 'created', `${member?.name || 'Someone'} converted task to subtask of "${parentTask?.name || 'task'}"`);
    toast.success('Converted to subtask', { description: task.name });
  }, [tasks, commit, logActivity]);

  /* ---- #34: Bulk set due date / add tag / set status ---- */
  const bulkSetDueDate = useCallback((ids: Set<string>, date: string | null) => {
    updateTasksBulk(ids, { dueDate: date || undefined });
    toast.success(date ? `Due date set for ${ids.size} task${ids.size > 1 ? 's' : ''}` : `Due date cleared for ${ids.size} task${ids.size > 1 ? 's' : ''}`);
  }, [updateTasksBulk]);

  const bulkAddTag = useCallback((ids: Set<string>, tagId: string) => {
    updateTasksBulk(ids, (t) => {
      const current = t.tags || [];
      return { tags: current.includes(tagId) ? current : [...current, tagId] };
    });
    toast.success(`Tag added to ${ids.size} task${ids.size > 1 ? 's' : ''}`);
  }, [updateTasksBulk]);

  const bulkRemoveTag = useCallback((ids: Set<string>, tagId: string) => {
    updateTasksBulk(ids, (t) => ({
      tags: (t.tags || []).filter(tid => tid !== tagId),
    }));
    toast.success(`Tag removed from ${ids.size} task${ids.size > 1 ? 's' : ''}`);
  }, [updateTasksBulk]);

  /* ---- #35: Sections ---- */
  const addSection = useCallback((name: string) => {
    if (!currentProjectId) return;
    const id = 'sec_' + Math.random().toString(36).slice(2, 8);
    const currentSections = sectionsByProject[currentProjectId] || [];
    const newSection: Section = { id, projectId: currentProjectId, name, position: currentSections.length, collapsed: false };
    setSectionsByProject(prev => ({ ...prev, [currentProjectId]: [...(prev[currentProjectId] || []), newSection] }));
    toast.success('Section added', { description: name });
  }, [currentProjectId, sectionsByProject]);

  const renameSection = useCallback((sectionId: string, name: string) => {
    if (!currentProjectId) return;
    setSectionsByProject(prev => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).map(s => s.id === sectionId ? { ...s, name } : s),
    }));
  }, [currentProjectId]);

  const deleteSection = useCallback((sectionId: string) => {
    if (!currentProjectId) return;
    /* Unlink tasks from this section */
    commit(tasks.map(t => t.sectionId === sectionId ? { ...t, sectionId: null } : t));
    setSectionsByProject(prev => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).filter(s => s.id !== sectionId),
    }));
    toast.success('Section removed');
  }, [currentProjectId, tasks, commit]);

  const toggleSectionCollapsed = useCallback((sectionId: string) => {
    if (!currentProjectId) return;
    setSectionsByProject(prev => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).map(s => s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s),
    }));
  }, [currentProjectId]);

  const reorderSection = useCallback((sectionId: string, toIndex: number) => {
    if (!currentProjectId) return;
    const currentSections = [...(sectionsByProject[currentProjectId] || [])];
    const idx = currentSections.findIndex(s => s.id === sectionId);
    if (idx === -1 || idx === toIndex) return;
    const [removed] = currentSections.splice(idx, 1);
    currentSections.splice(toIndex, 0, removed);
    /* Re-number positions */
    const renumbered = currentSections.map((s, i) => ({ ...s, position: i }));
    setSectionsByProject(prev => ({ ...prev, [currentProjectId]: renumbered }));
  }, [currentProjectId, sectionsByProject]);

  const setTaskSection = useCallback((taskId: string, sectionId: string | null) => {
    commit(tasks.map(t => t.id === taskId ? { ...t, sectionId } : t));
  }, [tasks, commit]);

  const bulkSetStatus = useCallback((ids: Set<string>, status: string) => {
    const progress = status === 'done' ? 100 : status === 'backlog' ? 0 : undefined;
    updateTasksBulk(ids, progress !== undefined ? { status, progress } : { status });
    toast.success(`${ids.size} task${ids.size > 1 ? 's' : ''} set to ${STATUS_META[status]?.label || status}`);
  }, [updateTasksBulk]);

  /* Close menus on view change */
  useEffect(() => { setMoreMenuOpen(false); }, [activeView]);

  /* ====== Batch 7: Project Management Actions ====== */

  const updateProject = useCallback((projectId: string, patch: Partial<Project>) => {
    setProjects(prev => {
      const p = prev[projectId];
      if (!p) return prev;
      return { ...prev, [projectId]: { ...p, ...patch } };
    });
  }, []);

  const toggleProjectFavorite = useCallback((projectId: string) => {
    setProjects(prev => {
      const p = prev[projectId];
      if (!p) return prev;
      return { ...prev, [projectId]: { ...p, isFavorite: !p.isFavorite } };
    });
  }, []);

  const archiveProject = useCallback((projectId: string) => {
    setProjects(prev => {
      const p = prev[projectId];
      if (!p) return prev;
      return { ...prev, [projectId]: { ...p, isArchived: true } };
    });
    if (currentProjectId === projectId) goToPortfolio();
    toast.success('Project archived');
  }, [currentProjectId, goToPortfolio]);

  const restoreProject = useCallback((projectId: string) => {
    setProjects(prev => {
      const p = prev[projectId];
      if (!p) return prev;
      return { ...prev, [projectId]: { ...p, isArchived: false } };
    });
    toast.success('Project restored');
  }, []);

  const setProjectMembers = useCallback((projectId: string, members: string[]) => {
    setProjects(prev => {
      const p = prev[projectId];
      if (!p) return prev;
      return { ...prev, [projectId]: { ...p, members } };
    });
  }, []);

  const addProjectStatusUpdate = useCallback((text: string, color: 'green' | 'yellow' | 'red') => {
    if (!currentProjectId) return;
    const id = 'su' + Math.random().toString(36).slice(2, 8);
    const update: ProjectStatusUpdate = {
      id, projectId: currentProjectId, authorId: CURRENT_USER_ID,
      text, color, createdAt: new Date().toISOString(),
    };
    setStatusUpdatesByProject(prev => ({
      ...prev,
      [currentProjectId]: [...(prev[currentProjectId] || []), update],
    }));
    toast.success('Status update posted');
  }, [currentProjectId]);

  const deleteProjectStatusUpdate = useCallback((id: string) => {
    if (!currentProjectId) return;
    setStatusUpdatesByProject(prev => ({
      ...prev,
      [currentProjectId]: (prev[currentProjectId] || []).filter(su => su.id !== id),
    }));
  }, [currentProjectId]);

  const saveProjectAsTemplate = useCallback((name: string, includeTasks: boolean) => {
    if (!currentProjectId) return;
    const p = projects[currentProjectId];
    if (!p) return;
    const tid = 'tpl_' + Math.random().toString(36).slice(2, 8);
    const taskList = includeTasks ? (tasksByProject[currentProjectId] || []) : [];
    const tagList = (tagsByProject[currentProjectId] || []).map(t => ({ name: t.name, color: t.color }));
    const colsList = customColsByProject[currentProjectId] || [];
    /* Save custom template to localStorage */
    try {
      const raw = localStorage.getItem('flowdeck-custom-templates');
      const existing = raw ? JSON.parse(raw) : [];
      existing.push({
        id: tid, name, description: p.description || '', icon: '📁', color: p.color,
        taskCount: taskList.length, tags: tagList, customCols: colsList,
        tasks: taskList.map(t => ({ ...t, id: '', parentId: null, createdAt: undefined })),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('flowdeck-custom-templates', JSON.stringify(existing));
      toast.success(`Template "${name}" saved`);
    } catch { toast.error('Failed to save template'); }
  }, [currentProjectId, projects, tasksByProject, tagsByProject, customColsByProject]);

  /* ---- #47: Goals / OKRs ---- */
  const addGoal = useCallback((goal: Goal) => { setGoals(prev => [...prev, goal]); toast.success('Goal added'); }, []);
  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => { setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g)); }, []);
  const deleteGoal = useCallback((id: string) => { setGoals(prev => prev.filter(g => g.id !== id)); setKeyResults(prev => prev.filter(kr => kr.goalId !== id)); toast.success('Goal deleted'); }, []);
  const addKeyResult = useCallback((kr: KeyResult) => { setKeyResults(prev => [...prev, kr]); }, []);
  const updateKeyResult = useCallback((id: string, patch: Partial<KeyResult>) => { setKeyResults(prev => prev.map(kr => kr.id === id ? { ...kr, ...patch } : kr)); }, []);
  const deleteKeyResult = useCallback((id: string) => { setKeyResults(prev => prev.filter(kr => kr.id !== id)); }, []);

  /* ---- #49: Saved Filters ---- */
  const saveFilter = useCallback((name: string, filters: SearchFilters) => {
    const sf: SavedFilter = { id: 'sf' + Math.random().toString(36).slice(2, 8), name, filters, createdAt: new Date().toISOString() };
    setSavedFilters(prev => [...prev, sf]);
    toast.success(`Filter "${name}" saved`);
  }, []);
  const deleteSavedFilter = useCallback((id: string) => { setSavedFilters(prev => prev.filter(f => f.id !== id)); }, []);
  const renameSavedFilter = useCallback((id: string, name: string) => { setSavedFilters(prev => prev.map(f => f.id === id ? { ...f, name } : f)); }, []);
  const toggleSavedFilterPin = useCallback((id: string) => { setSavedFilters(prev => prev.map(f => f.id === id ? { ...f, isPinned: !f.isPinned } : f)); }, []);
  const applySavedFilter = useCallback((id: string) => {
    const sf = savedFilters.find(f => f.id === id);
    if (sf) setSearchFilters(sf.filters);
  }, [savedFilters, setSearchFilters]);

  /* ---- Automations ---- */
  const addAutomation = useCallback((rule: AutomationRule) => { setAutomations(prev => [...prev, rule]); toast.success('Automation created'); }, []);
  const updateAutomation = useCallback((id: string, patch: Partial<AutomationRule>) => {
    setAutomations(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    toast.success('Automation updated');
  }, []);
  const deleteAutomation = useCallback((id: string) => { setAutomations(prev => prev.filter(r => r.id !== id)); toast.success('Automation deleted'); }, []);
  const executeAutomation = useCallback((taskId: string, triggerType: string, newValue: string, projectId: string) => {
    setAutomations(prev => {
      const rules = prev.filter(r => r.enabled);
      rules.forEach(rule => {
        let match = false;
        if (rule.trigger.type === triggerType) {
          if (triggerType === 'status_change' && rule.trigger.value === newValue) match = true;
          if (triggerType === 'priority_change' && rule.trigger.value === newValue) match = true;
          if (triggerType === 'task_completed') match = true;
          if (triggerType === 'task_created') match = true;
        }
        if (match && rule.actions.length > 0) {
          rule.actions.forEach(action => {
            if (projectId && tasksByProject[projectId]) {
              const taskList = tasksByProject[projectId];
              setTasksByProject(prevTasks => {
                const copy = { ...prevTasks, [projectId]: taskList.map(t => {
                  if (t.id !== taskId) return t;
                  const patch: Partial<Task> = {};
                  if (action.type === 'set_status' && action.value) patch.status = action.value;
                  if (action.type === 'set_priority' && action.value) patch.priority = action.value;
                  if (action.type === 'set_assignee' && action.value) patch.assignee = action.value;
                  if (action.type === 'set_due_date' && action.value) patch.dueDate = action.value;
                  return { ...t, ...patch };
                })};
                return copy;
              });
            }
          });
          toast.info(`Automation "${rule.name}" triggered`);
        }
      });
      return prev;
    });
  }, [tasksByProject]);

  /* ---- Forms ---- */
  const addForm = useCallback((form: Form) => { setForms(prev => [...prev, form]); toast.success('Form created'); }, []);
  const updateForm = useCallback((id: string, patch: Partial<Form>) => { setForms(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f)); toast.success('Form updated'); }, []);
  const deleteForm = useCallback((id: string) => { setForms(prev => prev.filter(f => f.id !== id)); toast.success('Form deleted'); }, []);
  const addSubmission = useCallback((submission: FormSubmission) => {
    setSubmissions(prev => [...prev, submission]);
    // Auto-create task from submission
    const form = forms.find(f => f.id === submission.formId);
    if (form && form.isActive) {
      const taskName = submission.data['name'] || submission.data['title'] || `Request from ${new Date(submission.submittedAt).toLocaleDateString()}`;
      const desc = Object.entries(submission.data).filter(([k]) => !['name', 'title', 'email'].includes(k)).map(([k, v]) => `**${k}:** ${v}`).join('\n');
      const pid = form.projectId;
      if (pid && tasksByProject[pid]) {
        const newTask: Task = {
          id: 't' + Date.now(),
          name: taskName,
          status: 'backlog',
          assignee: CURRENT_USER_ID,
          start: TODAY.toISOString().slice(0, 10),
          duration: 5,
          progress: 0,
          priority: 'medium',
          deps: [],
          description: desc,
          createdAt: new Date().toISOString(),
        };
        setTasksByProject(prev => ({ ...prev, [pid]: [...(prev[pid] || []), newTask] }));
      }
    }
    toast.success('Submission received');
  }, [forms, tasksByProject]);

  /* ---- Approvals ---- */
  const addApproval = useCallback((approval: ApprovalRequest) => { setApprovals(prev => [...prev, approval]); toast.success('Approval requested'); }, []);
  const resolveApproval = useCallback((id: string, approved: boolean, comment?: string) => {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: approved ? 'approved' as const : 'rejected' as const, resolvedAt: new Date().toISOString(), comment } : a));
    toast.success(approved ? 'Approved' : 'Rejected');
  }, []);
  const deleteApproval = useCallback((id: string) => { setApprovals(prev => prev.filter(a => a.id !== id)); }, []);

  /* ---- Budget & Expense ---- */
  const addBudget = useCallback((budget: Budget) => { setBudgets(prev => [...prev, budget]); toast.success('Budget created'); }, []);
  const updateBudget = useCallback((id: string, patch: Partial<Budget>) => { setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b)); }, []);
  const deleteBudget = useCallback((id: string) => { setBudgets(prev => prev.filter(b => b.id !== id)); setExpenses(prev => prev.filter(e => e.budgetId !== id)); toast.success('Budget deleted'); }, []);
  const addExpense = useCallback((expense: Expense) => {
    setExpenses(prev => [...prev, expense]);
    // Update spent on parent budget
    setBudgets(prev => prev.map(b => b.id === expense.budgetId ? { ...b, spent: b.spent + expense.amount } : b));
    toast.success('Expense added');
  }, []);
  const deleteExpense = useCallback((id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (exp) {
      setBudgets(prev => prev.map(b => b.id === exp.budgetId ? { ...b, spent: Math.max(0, b.spent - exp.amount) } : b));
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, [expenses]);

  /* ---- Timesheets ---- */
  const addTimesheetEntry = useCallback((entry: TimesheetEntry) => {
    setTimesheets(prev => {
      const existing = prev.find(e => e.userId === entry.userId && e.projectId === entry.projectId && e.taskId === entry.taskId && e.date === entry.date);
      if (existing) {
        return prev.map(e => e.id === existing.id ? { ...e, hours: entry.hours, note: entry.note || e.note } : e);
      }
      return [...prev, entry];
    });
  }, []);
  const updateTimesheetEntry = useCallback((id: string, patch: Partial<TimesheetEntry>) => {
    setTimesheets(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }, []);
  const deleteTimesheetEntry = useCallback((id: string) => { setTimesheets(prev => prev.filter(e => e.id !== id)); }, []);

  return {
    projects, tasksByProject, filesByProject, raidByProject, customColsByProject,
    tagsByProject, commentsByProject, activityByProject, timeLogsByProject,
    currentUserId: CURRENT_USER_ID,
    currentProjectId, activeView, selectedTaskId, selectedIds, searchQuery,
    showNewTask, showNewProject, projectMenuOpen, shareOpen, sidebarOpen, moreMenuOpen,
    durationUnit, clipboard, past, future,
    viewingFileId, setViewingFileId,
    project, tasks, files, raidItems, customCols, filteredTasks, selectedTask, viewingFile,
    tags, taskComments, taskActivity,
    searchFilters, setSearchFilters, activeFilterCount, clearFilters,
    timeLogs, taskTimeLogs,
    gridActions,
    openProject, goToPortfolio, createProject, createProjectFromTemplate, deleteProject,
    updateTask, addTask, removeTask, removeTasksBulk, moveStatus, toggleComplete,
    duplicateTask, duplicateTaskWithOptions, duplicateTasksBulk,
    moveTaskToProject, moveTasksToProjectBulk,
    promoteSubtask, demoteToSubtask,
    bulkSetDueDate, bulkAddTag, bulkRemoveTag, bulkSetStatus,
    sections,
    addSection, renameSection, deleteSection, toggleSectionCollapsed, reorderSection, setTaskSection,
    /* Batch 7 */
    updateProject, toggleProjectFavorite, archiveProject, restoreProject,
    setProjectMembers, projectStatusUpdates, addProjectStatusUpdate, deleteProjectStatusUpdate,
    saveProjectAsTemplate,
    /* #47 */
    goals, keyResults, addGoal, updateGoal, deleteGoal, addKeyResult, updateKeyResult, deleteKeyResult,
    /* #49 */
    savedFilters, saveFilter, deleteSavedFilter, renameSavedFilter, toggleSavedFilterPin, applySavedFilter,
    /* Automations */
    automations, addAutomation, updateAutomation, deleteAutomation, executeAutomation,
    /* Forms */
    forms, submissions, addForm, updateForm, deleteForm, addSubmission,
    /* Approvals */
    approvals, addApproval, resolveApproval, deleteApproval,
    /* Budget & Expense */
    budgets, expenses, addBudget, updateBudget, deleteBudget, addExpense, deleteExpense,
    /* Timesheets */
    timesheets, addTimesheetEntry, updateTimesheetEntry, deleteTimesheetEntry,
    addFiles, removeFile, linkFile,
    addRaidItem, updateRaidItem, removeRaidItem,
    addColumn, removeColumn, openFileViewer,
    addTag, removeTag, toggleTaskTag,
    addComment, deleteComment, editComment, toggleReaction,
    toggleFollower,
    addTimeLog, deleteTimeLog,
    reorderTask, quickAddTask,
    /* Reset persisted state */
    resetToDefaults: () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    },
    /* Expose setters for layout components */
    setActiveView, setSelectedTaskId, setSearchQuery,
    setShowNewTask, setShowNewProject, setProjectMenuOpen, setShareOpen,
    setSidebarOpen, setMoreMenuOpen, setSelectedIds,
  } as FlowDeckState;
}

export function useFlowDeck(): FlowDeckState {
  const context = useOptionalFlowdekData();
  if (context) return context;
  throw new Error('useFlowDeck must be used within a FlowdekDataProvider');
}
