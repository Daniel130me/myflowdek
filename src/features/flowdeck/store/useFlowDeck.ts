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
  type Task, type Project, type FileItem, type RaidItem, type CustomColumn, type TaskStatus, type TaskPriority,
  type Tag, type Comment, type ActivityEntry, type TimeLog, type SearchFilters, type Section, type Reaction, type Goal, type KeyResult, type SavedFilter, EMPTY_FILTERS,
  type AutomationRule, type Form, type FormSubmission, type ApprovalRequest, type Budget, type Expense, type TimesheetEntry, type CreateTaskInput,
} from '@/features/flowdeck/model';
import type { GridActions } from '../components/toolbar/types';
import type { ProjectStatusUpdate } from '@/features/flowdeck/model';
import { useOptionalFlowdekData } from '@/providers/FlowdekDataProvider';
import { loadPersistedState, savePersistedState, clearPersistedState, loadCustomTemplates, saveCustomTemplates, STORAGE_KEY } from '@/data/local-storage/storageAdapter';
import { defaultIdGenerator } from '@/shared/utils/id';
import {
  apiUpdateTask, apiDeleteTask, apiCreateTask, apiBulkAction,
  apiAddComment, apiEditComment, apiDeleteComment,
  apiAddReaction, apiRemoveReaction,
  apiAddTaskTag, apiRemoveTaskTag,
  apiFollowTask, apiUnfollowTask,
  apiCreateSection, apiDeleteSection,
  apiAddDependency, apiRemoveDependency,
  apiAddTimeLog, apiDeleteTimeLog,
} from '@/lib/api-client';

/* ---- LocalStorage persistence ---- */
const SAVE_DEBOUNCE = 500;

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
  statusUpdatesByProject: Record<string, ProjectStatusUpdate[]>;
  tagsByProject: Record<string, Tag[]>;
  commentsByProject: Record<string, Comment[]>;
  activityByProject: Record<string, ActivityEntry[]>;
  timeLogsByProject: Record<string, TimeLog[]>;
  sectionsByProject: Record<string, Section[]>;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;

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
  syncProjectFromRoute: (id: string) => void;
  /** Replace a project's tasks with data fetched from the API. Used during
   *  the mock-to-real migration so existing views/mutations work with real
   *  data without rewiring every handler. */
  syncProjectTasks: (projectId: string, tasks: Task[]) => void;
  /** Replace a project's tags with API data. */
  syncProjectTags: (projectId: string, tags: Tag[]) => void;
  /** Replace a project's comments with API data. */
  syncProjectComments: (projectId: string, comments: Comment[]) => void;
  /** Replace a project's files with API data. */
  syncProjectFiles: (projectId: string, files: FileItem[]) => void;
  /**
   * Replace the entire projects map with the API results for the given
   * workspace. Called by `useProjects` whenever the API responds. The
   * `workspaceId` is informational — the store tracks projects by id and
   * shows whichever workspace is currently selected.
   */
  syncProjects: (workspaceId: string, projects: Record<string, Project>) => void;
  /**
   * Upsert a single project (real or optimistic) into the store. Used after
   * creating a project via the API, or when an individual fetch returns a
   * project that should appear in the sidebar/portfolio.
   */
  upsertProject: (project: Project) => void;
  goToPortfolio: () => void;
  createProject: (p: { name: string; color: string; start: string; end: string }) => void;
  createProjectFromTemplate: (templateId: string, name: string, color: string, start: string, end: string) => void;
  deleteProject: (id: string) => void;
  updateTask: (projectId: string, taskId: string, patch: Partial<Task>) => void;
  addTask: (projectId: string, input: CreateTaskInput | Task) => void;
  removeTask: (projectId: string, taskId: string) => void;
  removeTasksBulk: (projectId: string, ids: Set<string>) => void;
  duplicateTask: (projectId: string, id: string) => void;
  moveStatus: (projectId: string, taskId: string, status: string) => void;
  toggleComplete: (projectId: string, taskId: string) => void;
  addFiles: (projectId: string, files: FileItem[]) => void;
  removeFile: (projectId: string, fileId: string) => void;
  linkFile: (projectId: string, fileId: string, linkedTaskId: string | null) => void;
  addRaidItem: (projectId: string, item: RaidItem) => void;
  updateRaidItem: (projectId: string, id: string, patch: Partial<RaidItem>) => void;
  removeRaidItem: (projectId: string, id: string) => void;
  addColumn: (projectId: string, def: CustomColumn) => void;
  removeColumn: (projectId: string, key: string) => void;
  openFileViewer: (fileId: string) => void;
  /* Tags */
  addTag: (projectId: string, tag: Tag) => void;
  removeTag: (projectId: string, tagId: string) => void;
  toggleTaskTag: (projectId: string, taskId: string, tagId: string) => void;
  /* Comments */
  addComment: (projectId: string, taskId: string, text: string, parentId?: string | null) => void;
  deleteComment: (projectId: string, commentId: string) => void;
  editComment: (projectId: string, commentId: string, newText: string) => void;
  toggleReaction: (projectId: string, commentId: string, emoji: string) => void;
  /* Followers */
  toggleFollower: (projectId: string, taskId: string, userId: string) => void;
  /* Time Logs */
  timeLogs: TimeLog[];
  taskTimeLogs: TimeLog[];
  addTimeLog: (projectId: string, taskId: string, minutes: number, note: string) => void;
  deleteTimeLog: (projectId: string, timeLogId: string) => void;
  /* Reorder & Quick Add */
  reorderTask: (projectId: string, taskId: string, toIndex: number) => void;
  quickAddTask: (projectId: string, name: string, opts?: { status?: string; parentId?: string | null; startOverride?: string }) => string | undefined;
  /* Batch 6 */
  duplicateTaskWithOptions: (projectId: string, id: string, opts: { includeSubtasks: boolean; includeComments: boolean; includeAttachments: boolean }) => void;
  duplicateTasksBulk: (projectId: string, ids: Set<string>) => void;
  moveTaskToProject: (sourceProjectId: string, taskId: string, targetProjectId: string) => void;
  moveTasksToProjectBulk: (sourceProjectId: string, ids: Set<string>, targetProjectId: string) => void;
  promoteSubtask: (projectId: string, taskId: string) => void;
  demoteToSubtask: (projectId: string, taskId: string, newParentId: string) => void;
  bulkSetDueDate: (projectId: string, ids: Set<string>, date: string | null) => void;
  bulkAddTag: (projectId: string, ids: Set<string>, tagId: string) => void;
  bulkRemoveTag: (projectId: string, ids: Set<string>, tagId: string) => void;
  bulkSetStatus: (projectId: string, ids: Set<string>, status: string) => void;
  bulkAssign: (projectId: string, ids: Set<string>, memberId: string) => void;
  bulkSetPriority: (projectId: string, ids: Set<string>, priority: TaskPriority) => void;
  bulkComplete: (projectId: string, ids: Set<string>) => void;
  /* #35: Sections */
  sections: Section[];
  addSection: (projectId: string, name: string) => void;
  renameSection: (projectId: string, sectionId: string, name: string) => void;
  deleteSection: (projectId: string, sectionId: string) => void;
  toggleSectionCollapsed: (projectId: string, sectionId: string) => void;
  reorderSection: (projectId: string, sectionId: string, toIndex: number) => void;
  setTaskSection: (projectId: string, taskId: string, sectionId: string | null) => void;
  /* Batch 7: Project management */
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  toggleProjectFavorite: (projectId: string) => void;
  archiveProject: (projectId: string) => void;
  restoreProject: (projectId: string) => void;
  setProjectMembers: (projectId: string, members: string[]) => void;
  projectStatusUpdates: ProjectStatusUpdate[];
  addProjectStatusUpdate: (projectId: string, text: string, color: 'green' | 'yellow' | 'red') => void;
  deleteProjectStatusUpdate: (projectId: string, id: string) => void;
  saveProjectAsTemplate: (projectId: string, name: string, includeTasks: boolean) => void;
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
  const [customColsByProject, setCustomColsByProject] = useState<Record<string, CustomColumn[]>>({});
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

  const [activityByProject, setActivityByProject] = useState<Record<string, ActivityEntry[]>>({});

  // Authenticated user identity. Initialized from the demo constant as a
  // fallback (for the mock-only store), but overridden by the session via
  // setCurrentUserId() in FlowdekDataProvider. The ref lets useCallback
  // actions read the latest value without re-creating on every change.
  const [currentUserId, setCurrentUserIdState] = useState<string>(CURRENT_USER_ID);
  const userIdRef = useRef(currentUserId);
  userIdRef.current = currentUserId;
  const setCurrentUserId = useCallback((id: string) => {
    userIdRef.current = id;
    setCurrentUserIdState(id);
  }, []);

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
  const [statusUpdatesByProject, setStatusUpdatesByProject] = useState<Record<string, ProjectStatusUpdate[]>>({});

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
        // Only persist UI-only state to localStorage — NOT business data.
        // Business data (projects, tasks, comments, etc.) is now the
        // server's responsibility via the API. LocalStorage is used only
        // for UI settings that don't need to survive across devices.
        const state = {
          currentProjectId,
          activeView,
        };
        savePersistedState(state);
      } catch { /* storage full or private mode */ }
    }, SAVE_DEBOUNCE);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [hydrated, currentProjectId, activeView]);

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

  const syncProjectFromRoute = useCallback((id: string) => {
    if (!projects[id]) return;
    if (currentProjectId === id) return;
    setCurrentProjectId(id);
  }, [currentProjectId, projects]);

  const openProject = useCallback((id: string) => {
    setCurrentProjectId(id);
    setActiveView('dashboard');
    setProjectMenuOpen(false);
    setSelectedTaskId(null);
    setSelectedIds(new Set());
    setSidebarOpen(false);
  }, []);

  // --- API sync actions ---
  // Replace a project's data with what the API returned. These are one-way
  // merges: local mutations after the sync still go through the existing
  // store actions. A future phase can wire mutations to the API too.
  const syncProjectTasks = useCallback((projectId: string, tasks: Task[]) => {
    setTasksByProject(prev => ({ ...prev, [projectId]: tasks }));
  }, []);

  const syncProjectTags = useCallback((projectId: string, tags: Tag[]) => {
    setTagsByProject(prev => ({ ...prev, [projectId]: tags }));
  }, []);

  const syncProjectComments = useCallback((projectId: string, comments: Comment[]) => {
    setCommentsByProject(prev => ({ ...prev, [projectId]: comments }));
  }, []);

  const syncProjectFiles = useCallback((projectId: string, files: FileItem[]) => {
    setFilesByProject(prev => ({ ...prev, [projectId]: files }));
  }, []);

  /**
   * Replace the projects map with the API response for the selected
   * workspace. Empty results reset the map (so switching to a workspace with
   * no projects clears the sidebar instead of showing stale data).
   */
  const syncProjects = useCallback(
    (_workspaceId: string, incoming: Record<string, Project>) => {
      setProjects(incoming);
    },
    [],
  );

  /** Upsert a single project (real or optimistic) into the projects map. */
  const upsertProject = useCallback((project: Project) => {
    setProjects(prev => ({ ...prev, [project.id]: project }));
  }, []);

  const goToPortfolio = useCallback(() => {
    setActiveView('projects');
    setProjectMenuOpen(false);
    setSidebarOpen(false);
  }, []);

  const createProject = useCallback(({ name, color, start, end }: { name: string; color: string; start: string; end: string }) => {
    const id = defaultIdGenerator.generate('p');
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
    const id = defaultIdGenerator.generate('p');
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
  const logActivity = useCallback((projectId: string, taskId: string, type: ActivityEntry['type'], description: string) => {
    if (!projectId) return;
    const entry: ActivityEntry = {
      id: defaultIdGenerator.generate('a'),
      taskId, type, description,
      authorId: userIdRef.current,
      timestamp: new Date().toISOString(),
    };
    setActivityByProject(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), entry],
    }));
  }, []);

  /* ---- history-tracked task mutation ---- */
  const commit = useCallback((projectId: string, nextTasksForProject: Task[]) => {
    setPast(p => [...p.slice(-49), tasksByProject]);
    setFuture([]);
    if (projectId) setTasksByProject(prev => ({ ...prev, [projectId]: nextTasksForProject }));
  }, [tasksByProject]);

  /**
   * Undo/redo is disabled for persisted task mutations. The store now writes
   * every change through to PostgreSQL, so reverting locally would silently
   * diverge from the server. Surface a toast so the user knows the shortcut
   * is intentional (item: undo/redo → toast.info).
   *
   * The history stacks (`past`/`future`) are still maintained by `commit()`
   * for legacy call sites that inspect `canUndo`/`canRedo`, but pressing
   * the shortcut is a no-op.
   */
  const undo = useCallback(() => {
    toast.info('Undo/Redo is not available for persisted task changes');
  }, []);
  const redo = useCallback(() => {
    toast.info('Undo/Redo is not available for persisted task changes');
  }, []);

  const updateTask = useCallback((projectId: string, id: string, patch: Partial<Task>) => {
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === id);
    // Snapshot for rollback — captures the pre-update task list for this
    // project so we can restore it if the API rejects the change.
    const snapshot = projectTasks;
    // Optimistic local update.
    commit(projectId, projectTasks.map(t => t.id === id ? { ...t, ...patch } : t));
    if (task && patch.status && patch.status !== task.status) {
      const member = TEAM.find(m => m.id === userIdRef.current);
      logActivity(projectId, id, 'status_change', `${member?.name || 'Someone'} changed status to ${STATUS_META[patch.status]?.label || patch.status}`);
    }
    if (task && patch.priority && patch.priority !== task.priority) {
      const member = TEAM.find(m => m.id === userIdRef.current);
      logActivity(projectId, id, 'priority_change', `${member?.name || 'Someone'} changed priority to ${PRIORITY_META[patch.priority]?.label || patch.priority}`);
    }
    if (task && patch.dueDate && patch.dueDate !== task.dueDate) {
      const member = TEAM.find(m => m.id === userIdRef.current);
      logActivity(projectId, id, 'due_date_change', `${member?.name || 'Someone'} changed due date`);
    }
    // Persist to PostgreSQL. On failure, restore the snapshot (full project
    // task list at the moment before the optimistic update) so the UI doesn't
    // show a change the server rejected.
    apiUpdateTask(id, patch).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to save task change', { description: res.error });
    });
  }, [tasksByProject, commit, logActivity]);

  const toggleComplete = useCallback((projectId: string, id: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === id);
    if (!task) return;
    const member = TEAM.find(m => m.id === userIdRef.current);
    // Snapshot for rollback.
    const snapshot = projectTasks;
    if (task.status === 'done') {
      // Reopen the task.
      const patch: Partial<Task> = { status: 'in_progress', progress: 0 };
      commit(projectId, projectTasks.map(t => t.id === id ? { ...t, ...patch } : t));
      logActivity(projectId, id, 'reopened', `${member?.name || 'Someone'} reopened this task`);
      toast.info('Task reopened', { description: task.name });
      apiUpdateTask(id, patch).then((res) => {
        if (res.ok) return;
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to reopen task', { description: res.error });
      });
    } else {
      // Mark the task done. The server's recurrence cron handles creating
      // the next occurrence — the browser no longer duplicates the task
      // (item: remove browser-side recurrence copy creation).
      const patch: Partial<Task> = { status: 'done', progress: 100 };
      commit(projectId, projectTasks.map(t => t.id === id ? { ...t, ...patch } : t));
      logActivity(projectId, id, 'completed', `${member?.name || 'Someone'} marked as done`);
      toast.success('Task completed', { description: task.name });
      apiUpdateTask(id, patch).then((res) => {
        if (res.ok) return;
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to complete task', { description: res.error });
      });
    }
  }, [tasksByProject, commit, logActivity]);

  const updateTasksBulk = useCallback((projectId: string, ids: Set<string>, patch: Partial<Task> | ((t: Task) => Partial<Task>)) => {
    if (projectId) {
      const projectTasks = tasksByProject[projectId] || [];
      commit(projectId, projectTasks.map(t => ids.has(t.id) ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t));
    }
  }, [tasksByProject, commit]);

  const addTask = useCallback((projectId: string, input: CreateTaskInput | Task) => {
    const projectTasks = tasksByProject[projectId] || [];
    const tempId = ('id' in input && input.id) ? input.id : defaultIdGenerator.generate('t');
    const createdAt = ('createdAt' in input && input.createdAt) ? input.createdAt : new Date().toISOString().slice(0, 10);
    const newTask: Task = {
      id: tempId,
      projectId,
      name: input.name,
      description: input.description,
      status: (input.status || 'backlog') as TaskStatus,
      assignee: input.assignee || userIdRef.current,
      start: input.start || TODAY.toISOString().slice(0, 10),
      duration: input.duration ?? 3,
      dueDate: input.dueDate,
      progress: ('progress' in input && typeof input.progress === 'number') ? input.progress : 0,
      priority: (input.priority || 'medium') as TaskPriority,
      deps: ('deps' in input && Array.isArray(input.deps)) ? input.deps : [],
      tags: input.tags,
      parentId: input.parentId || null,
      sectionId: input.sectionId || null,
      customFields: input.customFields,
      storyPoints: input.storyPoints,
      color: input.color || null,
      milestone: input.milestone,
      createdAt,
    };
    // Snapshot for rollback — captures the project task list before the
    // optimistic insert so we can restore it on API failure.
    const snapshot = projectTasks;
    // Optimistic local update.
    commit(projectId, [...projectTasks, newTask]);
    logActivity(projectId, tempId, 'created', `Task "${newTask.name}" was created`);
    toast.success('Task created', { description: newTask.name });
    // Persist to PostgreSQL. The API returns the canonical server task — we
    // swap the temp id for the server id so subsequent edits target the
    // right row. On failure we roll back the optimistic insert.
    apiCreateTask(projectId, {
      name: input.name,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assignee,
      parentId: input.parentId,
      sectionId: input.sectionId,
      dueDate: input.dueDate,
      startDate: input.start,
      duration: input.duration,
    }).then((res) => {
      if (!res.ok) {
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to create task on server', { description: res.error });
        return;
      }
      const serverId = res.data?.task?.id;
      if (!serverId || serverId === tempId) return;
      // Replace the temp id with the canonical server id everywhere it
      // appears in this project's task list (the task itself, plus any
      // sibling deps/parentId references that pointed at the temp id).
      setTasksByProject(prev => {
        const list = prev[projectId] || [];
        const next = list.map(t => {
          if (t.id === tempId) return { ...t, id: serverId };
          let changed = false;
          let nextDeps = t.deps;
          let nextParentId = t.parentId;
          if (t.deps.includes(tempId)) {
            nextDeps = t.deps.map(d => d === tempId ? serverId : d);
            changed = true;
          }
          if (t.parentId === tempId) {
            nextParentId = serverId;
            changed = true;
          }
          return changed ? { ...t, deps: nextDeps, parentId: nextParentId } : t;
        });
        return { ...prev, [projectId]: next };
      });
    });
  }, [tasksByProject, commit, logActivity]);
  const addTasksBulk = useCallback((projectId: string, newTasks: Task[]) => {
    if (projectId) {
      const projectTasks = tasksByProject[projectId] || [];
      commit(projectId, [...projectTasks, ...newTasks]);
    }
  }, [tasksByProject, commit]);

  const moveStatus = useCallback((projectId: string, id: string, status: string) => {
    const s = status as TaskStatus;
    const progress = s === 'done' ? 100 : s === 'backlog' ? 0 : undefined;
    updateTask(projectId, id, progress === undefined ? { status: s } : { status: s, progress });
  }, [updateTask]);

  const removeTask = useCallback((projectId: string, id: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === id);
    const descendantIds = new Set<string>();
    const collectDescendants = (parentId: string) => {
      for (const t of projectTasks) {
        if (t.parentId === parentId && !descendantIds.has(t.id)) {
          descendantIds.add(t.id);
          collectDescendants(t.id);
        }
      }
    };
    descendantIds.add(id);
    collectDescendants(id);
    // Snapshot for rollback — restore the pre-delete task list (and selection
    // set) if the server rejects the delete.
    const snapshot = projectTasks;
    const snapshotSelection = new Set(selectedIds);
    // Optimistic local update.
    commit(projectId, projectTasks.filter(t => !descendantIds.has(t.id)));
    setSelectedIds(prev => { const n = new Set(prev); for (const did of descendantIds) n.delete(did); return n; });
    toast.success('Task deleted', { description: task?.name || 'Task' });
    // Persist to PostgreSQL. The server cascades child-task deletion via the
    // schema, so a single DELETE /api/tasks/:id is enough for the whole
    // descendant tree.
    apiDeleteTask(id).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      setSelectedIds(snapshotSelection);
      toast.error('Failed to delete task on server', { description: res.error });
    });
  }, [tasksByProject, commit, selectedIds]);

  const removeTasksBulk = useCallback((projectId: string, ids: Set<string>) => {
    if (!projectId) return;
    const count = ids.size;
    const projectTasks = tasksByProject[projectId] || [];
    // Optimistic local update.
    commit(projectId, projectTasks.filter(t => !ids.has(t.id)));
    setSelectedIds(new Set());
    toast.success(`${count} task${count > 1 ? 's' : ''} deleted`);
    // Persist to PostgreSQL.
    apiBulkAction(projectId, 'delete', [...ids]).then((res) => {
      if (!res.ok) toast.error('Failed to delete tasks on server', { description: res.error });
    });
  }, [tasksByProject, commit]);

  const bulkSetDueDate = useCallback((projectId: string, ids: Set<string>, date: string | null) => {
    updateTasksBulk(projectId, ids, { dueDate: date || undefined });
    toast.success(date ? `Due date set for ${ids.size} task${ids.size > 1 ? 's' : ''}` : `Due date cleared for ${ids.size} task${ids.size > 1 ? 's' : ''}`);
  }, [updateTasksBulk]);

  const bulkAddTag = useCallback((projectId: string, ids: Set<string>, tagId: string) => {
    updateTasksBulk(projectId, ids, (t) => {
      const current = t.tags || [];
      return { tags: current.includes(tagId) ? current : [...current, tagId] };
    });
    toast.success(`Tag added to ${ids.size} task${ids.size > 1 ? 's' : ''}`);
  }, [updateTasksBulk]);

  const bulkRemoveTag = useCallback((projectId: string, ids: Set<string>, tagId: string) => {
    updateTasksBulk(projectId, ids, (t) => ({
      tags: (t.tags || []).filter(tid => tid !== tagId),
    }));
    toast.success(`Tag removed from ${ids.size} task${ids.size > 1 ? 's' : ''}`);
  }, [updateTasksBulk]);

  const bulkSetStatus = useCallback((projectId: string, ids: Set<string>, status: string) => {
    const s = status as TaskStatus;
    const progress = s === 'done' ? 100 : s === 'backlog' ? 0 : undefined;
    updateTasksBulk(projectId, ids, progress !== undefined ? { status: s, progress } : { status: s });
    toast.success(`${ids.size} task${ids.size > 1 ? 's' : ''} set to ${STATUS_META[s]?.label || s}`);
    apiBulkAction(projectId, 'status', [...ids], { status }).then((res) => {
      if (!res.ok) toast.error('Failed to save status change', { description: res.error });
    });
  }, [updateTasksBulk]);

  const bulkAssign = useCallback((projectId: string, ids: Set<string>, memberId: string) => {
    updateTasksBulk(projectId, ids, { assignee: memberId });
    const member = TEAM.find(m => m.id === memberId);
    toast.success(`Assigned ${ids.size} task${ids.size > 1 ? 's' : ''} to ${member?.name || 'someone'}`);
    apiBulkAction(projectId, 'assignee', [...ids], { assigneeId: memberId }).then((res) => {
      if (!res.ok) toast.error('Failed to save assignment', { description: res.error });
    });
  }, [updateTasksBulk]);

  const bulkSetPriority = useCallback((projectId: string, ids: Set<string>, priority: TaskPriority) => {
    updateTasksBulk(projectId, ids, { priority });
    toast.success(`Priority set to ${PRIORITY_META[priority].label} for ${ids.size} task${ids.size > 1 ? 's' : ''}`);
    apiBulkAction(projectId, 'priority', [...ids], { priority }).then((res) => {
      if (!res.ok) toast.error('Failed to save priority change', { description: res.error });
    });
  }, [updateTasksBulk]);

  const bulkComplete = useCallback((projectId: string, ids: Set<string>) => {
    updateTasksBulk(projectId, ids, { status: 'done', progress: 100 });
    toast.success(`Completed ${ids.size} task${ids.size > 1 ? 's' : ''}`);
    apiBulkAction(projectId, 'complete', [...ids]).then((res) => {
      if (!res.ok) toast.error('Failed to save completion', { description: res.error });
    });
  }, [updateTasksBulk]);

  const indentSelected = useCallback((projectId: string) => updateTasksBulk(projectId, selectedIds, (t: Task) => ({ level: Math.min(4, (t.level || 0) + 1) })), [selectedIds, updateTasksBulk]);
  const outdentSelected = useCallback((projectId: string) => updateTasksBulk(projectId, selectedIds, (t: Task) => ({ level: Math.max(0, (t.level || 0) - 1) })), [selectedIds, updateTasksBulk]);
  const linkSelected = useCallback((projectId: string) => {
    if (!projectId) return;
    const projectTasks = tasksByProject[projectId] || [];
    const ordered = projectTasks.filter(t => selectedIds.has(t.id));
    if (ordered.length < 2) return;
    const snapshot = projectTasks;
    const next = projectTasks.map(t => ({ ...t, deps: [...t.deps] }));
    /** Pairs to persist: (successorId, dependsOnId). */
    const pairs: Array<{ successorId: string; dependsOnId: string }> = [];
    for (let i = 1; i < ordered.length; i++) {
      const successor = next.find(t => t.id === ordered[i].id);
      const predId = ordered[i - 1].id;
      if (successor && !successor.deps.includes(predId)) {
        successor.deps.push(predId);
        pairs.push({ successorId: successor.id, dependsOnId: predId });
      }
    }
    commit(projectId, next);
    // Persist each new dependency edge in parallel. On any failure we roll
    // back the whole project's task list to the pre-link snapshot so the UI
    // can't show a dep that the server rejected.
    if (pairs.length === 0) return;
    Promise.all(pairs.map(p => apiAddDependency(p.successorId, p.dependsOnId))).then(results => {
      const firstFailure = results.find(r => !r.ok);
      if (!firstFailure) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to link tasks', { description: firstFailure.error });
    });
  }, [selectedIds, tasksByProject, commit]);
  const unlinkSelected = useCallback((projectId: string) => {
    if (!projectId) return;
    const projectTasks = tasksByProject[projectId] || [];
    const snapshot = projectTasks;
    /** Removed edges to persist: (successorId, dependsOnId). */
    const removedPairs: Array<{ successorId: string; dependsOnId: string }> = [];
    const next = projectTasks.map(t => {
      if (!selectedIds.has(t.id)) return t;
      const removed = t.deps.filter(d => selectedIds.has(d));
      for (const dependsOnId of removed) {
        removedPairs.push({ successorId: t.id, dependsOnId });
      }
      return { ...t, deps: t.deps.filter(d => !selectedIds.has(d)) };
    });
    commit(projectId, next);
    if (removedPairs.length === 0) return;
    Promise.all(removedPairs.map(p => apiRemoveDependency(p.successorId, p.dependsOnId))).then(results => {
      const firstFailure = results.find(r => !r.ok);
      if (!firstFailure) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to unlink tasks', { description: firstFailure.error });
    });
  }, [selectedIds, tasksByProject, commit]);
  const setRecurrenceSelected = useCallback((projectId: string, freq: string | null) => updateTasksBulk(projectId, selectedIds, { recurrence: freq }), [selectedIds, updateTasksBulk]);
  const toggleBoldSelected = useCallback((projectId: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    const anyBold = projectTasks.some(t => selectedIds.has(t.id) && t.bold);
    updateTasksBulk(projectId, selectedIds, { bold: !anyBold });
  }, [selectedIds, tasksByProject, updateTasksBulk]);
  const setColorSelected = useCallback((projectId: string, color: string | null) => updateTasksBulk(projectId, selectedIds, { color }), [selectedIds, updateTasksBulk]);
  const toggleMilestoneSelected = useCallback((projectId: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    const anyMilestone = projectTasks.some(t => selectedIds.has(t.id) && t.milestone);
    updateTasksBulk(projectId, selectedIds, { milestone: !anyMilestone });
  }, [selectedIds, tasksByProject, updateTasksBulk]);
  const copySelected = useCallback((projectId: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    setClipboard({ items: projectTasks.filter(t => selectedIds.has(t.id)).map(t => ({ ...t })), mode: 'copy' });
  }, [selectedIds, tasksByProject]);
  const cutSelected = useCallback((projectId: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    setClipboard({ items: projectTasks.filter(t => selectedIds.has(t.id)).map(t => ({ ...t })), mode: 'cut' });
    removeTasksBulk(projectId, selectedIds);
  }, [selectedIds, tasksByProject, removeTasksBulk]);
  const paste = useCallback((projectId: string) => {
    if (!clipboard.items.length || !projectId) return;
    const clones = clipboard.items.map(t => ({ ...t, id: defaultIdGenerator.generate('t'), projectId, name: t.name + ' (copy)' }));
    addTasksBulk(projectId, clones);
  }, [clipboard.items, addTasksBulk]);

  const importCSV = useCallback((projectId: string, file: File) => {
    if (!projectId) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as Record<string, string>[]).map(r => {
          const member = TEAM.find(m => m.name.toLowerCase() === (r.assignee || '').toLowerCase());
          return { id: defaultIdGenerator.generate('t'), projectId, name: r.name || 'Untitled task', description: r.description || undefined, assignee: member ? member.id : TEAM[0].id, start: r.start || TODAY.toISOString().slice(0, 10), duration: Number(r.duration) || 3, progress: Number(r.progress) || 0, priority: (PRIORITY_META[r.priority] ? r.priority : 'medium') as TaskPriority, status: (STATUS_META[r.status] ? r.status : 'backlog') as TaskStatus, deps: [] } as Task;
        });
        if (rows.length) addTasksBulk(projectId, rows);
      },
    });
  }, [addTasksBulk]);

  const exportCSV = useCallback((projectId: string) => {
    const project = projects[projectId];
    if (!project) return;
    const projectTasks = tasksByProject[projectId] || [];
    const csv = Papa.unparse(projectTasks.map(t => ({ name: t.name, description: t.description || '', assignee: TEAM.find(m => m.id === t.assignee)?.name || '', start: t.start, due_date: t.dueDate || '', duration: t.duration, progress: t.progress, priority: t.priority, status: t.status, tags: (t.tags || []).join(', ') })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${project.name.replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [tasksByProject, projects]);

  const attachFilesToSelected = useCallback((projectId: string, fileList: FileList) => {
    if (!selectedIds.size || !projectId) return;
    const targetId = [...selectedIds][0];
    const now = TODAY.toISOString().slice(0, 10);
    const newFiles = Array.from(fileList).map(f => ({ id: defaultIdGenerator.generate('f'), name: f.name, size: f.size, uploadedBy: userIdRef.current, uploadedAt: now, linkedTaskId: targetId, url: URL.createObjectURL(f) }));
    setFilesByProject(prev => ({ ...prev, [projectId]: [...newFiles, ...(prev[projectId] || [])] }));
  }, [selectedIds]);

  const addColumn = useCallback((projectId: string, def: CustomColumn) => {
    if (!projectId) return;
    setCustomColsByProject(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), def] }));
  }, []);

  const removeColumn = useCallback((projectId: string, key: string) => {
    if (!projectId) return;
    setCustomColsByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(c => c.key !== key) }));
  }, []);

  const addFiles = useCallback((projectId: string, newFiles: FileItem[]) => {
    if (!projectId) return;
    setFilesByProject(prev => ({ ...prev, [projectId]: [...newFiles, ...(prev[projectId] || [])] }));
  }, []);

  const removeFile = useCallback((projectId: string, id: string) => {
    if (!projectId) return;
    setFilesByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(f => f.id !== id) }));
  }, []);

  const linkFile = useCallback((projectId: string, id: string, linkedTaskId: string | null) => {
    if (!projectId) return;
    setFilesByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).map(f => f.id === id ? { ...f, linkedTaskId } : f) }));
  }, []);

  const addRaidItem = useCallback((projectId: string, item: RaidItem) => {
    if (!projectId) return;
    setRaidByProject(prev => ({ ...prev, [projectId]: [item, ...(prev[projectId] || [])] }));
  }, []);

  const updateRaidItem = useCallback((projectId: string, id: string, patch: Partial<RaidItem>) => {
    if (!projectId) return;
    setRaidByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).map(r => r.id === id ? { ...r, ...patch } : r) }));
  }, []);

  const removeRaidItem = useCallback((projectId: string, id: string) => {
    if (!projectId) return;
    setRaidByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(r => r.id !== id) }));
  }, []);

  /* ---- Tags ---- */
  const addTag = useCallback((projectId: string, tag: Tag) => {
    if (!projectId) return;
    setTagsByProject(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), tag] }));
    toast.success('Tag created', { description: tag.name });
  }, []);

  const removeTag = useCallback((projectId: string, tagId: string) => {
    if (!projectId) return;
    const tagList = tagsByProject[projectId] || [];
    const tag = tagList.find(t => t.id === tagId);
    setTagsByProject(prev => ({ ...prev, [projectId]: tagList.filter(t => t.id !== tagId) }));
    const projectTasks = tasksByProject[projectId] || [];
    commit(projectId, projectTasks.map(t => ({ ...t, tags: (t.tags || []).filter(tid => tid !== tagId) })));
    toast.success('Tag removed', { description: tag?.name || 'Tag' });
  }, [tagsByProject, tasksByProject, commit]);

  const toggleTaskTag = useCallback((projectId: string, taskId: string, tagId: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === taskId);
    if (!task) return;
    const currentTags = task.tags || [];
    const isAdding = !currentTags.includes(tagId);
    const newTags = isAdding
      ? [...currentTags, tagId]
      : currentTags.filter(t => t !== tagId);
    // Optimistic local update.
    commit(projectId, projectTasks.map(t => t.id === taskId ? { ...t, tags: newTags } : t));
    const tagList = tagsByProject[projectId] || [];
    const tag = tagList.find(tg => tg.id === tagId);
    if (tag) logActivity(projectId, taskId, isAdding ? 'tag_added' : 'tag_removed', `Tag "${tag.name}" ${isAdding ? 'added to' : 'removed from'} task`);
    // Persist to PostgreSQL.
    if (isAdding) {
      apiAddTaskTag(taskId, tagId).then((res) => {
        if (!res.ok) toast.error('Failed to add tag', { description: res.error });
      });
    } else {
      apiRemoveTaskTag(taskId, tagId).then((res) => {
        if (!res.ok) toast.error('Failed to remove tag', { description: res.error });
      });
    }
  }, [tasksByProject, tagsByProject, commit, logActivity]);

  /* ---- Reorder ---- */
  const reorderTask = useCallback((projectId: string, taskId: string, toIndex: number) => {
    const projectTasks = tasksByProject[projectId] || [];
    const idx = projectTasks.findIndex(t => t.id === taskId);
    if (idx === -1 || idx === toIndex) return;
    const arr = [...projectTasks];
    const [removed] = arr.splice(idx, 1);
    arr.splice(toIndex, 0, removed);
    commit(projectId, arr);
  }, [tasksByProject, commit]);

  /* ---- Quick Add ---- */
  const quickAddTask = useCallback((projectId: string, name: string, opts?: { status?: string; parentId?: string | null; startOverride?: string }) => {
    if (!name.trim()) return;
    const tempId = defaultIdGenerator.generate('t');
    const todayStr = TODAY.toISOString().slice(0, 10);
    const newTask: Task = {
      id: tempId,
      projectId,
      name: name.trim(),
      status: (opts?.status || 'backlog') as TaskStatus,
      assignee: userIdRef.current,
      start: opts?.startOverride || todayStr,
      duration: 3,
      progress: 0,
      priority: 'medium',
      deps: [],
      parentId: opts?.parentId || null,
      createdAt: new Date().toISOString(),
    };
    const projectTasks = tasksByProject[projectId] || [];
    // Snapshot for rollback.
    const snapshot = projectTasks;
    // Optimistic local update.
    commit(projectId, [...projectTasks, newTask]);
    logActivity(projectId, tempId, 'created', `Task "${newTask.name}" was created`);
    // Persist to PostgreSQL. Reconcile the temp id with the canonical server
    // id so subsequent edits target the right row. On failure we roll back.
    apiCreateTask(projectId, {
      name: name.trim(),
      status: opts?.status,
      parentId: opts?.parentId,
      startDate: opts?.startOverride,
    }).then((res) => {
      if (!res.ok) {
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to create task on server', { description: res.error });
        return;
      }
      const serverId = res.data?.task?.id;
      if (!serverId || serverId === tempId) return;
      setTasksByProject(prev => {
        const list = prev[projectId] || [];
        const next = list.map(t => {
          if (t.id === tempId) return { ...t, id: serverId };
          let changed = false;
          let nextDeps = t.deps;
          let nextParentId = t.parentId;
          if (t.deps.includes(tempId)) {
            nextDeps = t.deps.map(d => d === tempId ? serverId : d);
            changed = true;
          }
          if (t.parentId === tempId) {
            nextParentId = serverId;
            changed = true;
          }
          return changed ? { ...t, deps: nextDeps, parentId: nextParentId } : t;
        });
        return { ...prev, [projectId]: next };
      });
    });
    return tempId;
  }, [tasksByProject, commit, logActivity]);

  /* ---- Comments ---- */
  const addComment = useCallback((projectId: string, taskId: string, text: string, parentId?: string | null) => {
    if (!projectId || !text.trim()) return;
    const tempId = defaultIdGenerator.generate('c');
    const comment: Comment = {
      id: tempId,
      taskId,
      authorId: userIdRef.current,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      parentId: parentId || null,
      reactions: [],
    };
    // Snapshot for rollback — capture the pre-add comment list so we can
    // restore it if the API rejects the comment.
    const snapshot = commentsByProject[projectId] || [];
    // Optimistic local update.
    setCommentsByProject(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), comment],
    }));
    const member = TEAM.find(m => m.id === userIdRef.current);
    logActivity(projectId, taskId, 'comment', `${member?.name || 'Someone'} ${parentId ? 'replied' : 'commented'}`);
    // Persist to PostgreSQL. The API returns the canonical server comment —
    // we swap the temp id for the server id so subsequent edits/deletes
    // target the right row. On failure we roll back the optimistic insert.
    apiAddComment(projectId, taskId, text.trim(), parentId ?? undefined).then((res) => {
      if (!res.ok) {
        setCommentsByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to save comment', { description: res.error });
        return;
      }
      const serverId = res.data?.comment?.id;
      if (!serverId || serverId === tempId) return;
      setCommentsByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(c =>
          c.id === tempId ? { ...c, id: serverId } : c
        ),
      }));
    });
  }, [commentsByProject, logActivity]);

  const deleteComment = useCallback((projectId: string, commentId: string) => {
    if (!projectId) return;
    // Snapshot for rollback — capture the pre-delete comment list (the
    // server cascades replies, so we restore the whole subtree).
    const snapshot = commentsByProject[projectId] || [];
    // Optimistic local update.
    setCommentsByProject(prev => {
      const comments = prev[projectId] || [];
      const idsToDelete = new Set<string>();
      idsToDelete.add(commentId);
      comments.forEach(c => { if (c.parentId && idsToDelete.has(c.parentId)) idsToDelete.add(c.id); });
      return {
        ...prev,
        [projectId]: comments.filter(c => !idsToDelete.has(c.id)),
      };
    });
    // Persist to PostgreSQL. The server cascades reply deletion via the
    // schema, so a single DELETE removes the whole subtree.
    apiDeleteComment(commentId).then((res) => {
      if (res.ok) return;
      setCommentsByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to delete comment', { description: res.error });
    });
  }, [commentsByProject]);

  const editComment = useCallback((projectId: string, commentId: string, newText: string) => {
    if (!projectId || !newText.trim()) return;
    // Snapshot for rollback.
    const snapshot = commentsByProject[projectId] || [];
    // Optimistic local update.
    setCommentsByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(c =>
        c.id === commentId ? { ...c, text: newText.trim(), edited: true } : c
      ),
    }));
    // Persist to PostgreSQL.
    apiEditComment(commentId, newText.trim()).then((res) => {
      if (res.ok) return;
      setCommentsByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to edit comment', { description: res.error });
    });
  }, [commentsByProject]);

  const toggleReaction = useCallback((projectId: string, commentId: string, emoji: string) => {
    if (!projectId) return;
    // Capture the pre-toggle state so we can roll back on API failure.
    const projectComments = commentsByProject[projectId] || [];
    const commentBefore = projectComments.find(c => c.id === commentId);
    if (!commentBefore) return;

    const userId = userIdRef.current;
    const reactionsBefore = commentBefore.reactions ?? [];
    const existing = reactionsBefore.find(r => r.emoji === emoji);
    const wasReacting = !!existing && existing.userIds.includes(userId);
    const isAdding = !wasReacting;

    // ---- Optimistic update ----
    setCommentsByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(c => {
        if (c.id !== commentId) return c;
        const reactions = [...(c.reactions || [])];
        const ex = reactions.find(r => r.emoji === emoji);
        if (ex) {
          if (ex.userIds.includes(userId)) {
            const newUserIds = ex.userIds.filter(u => u !== userId);
            if (newUserIds.length === 0) {
              return { ...c, reactions: reactions.filter(r => r.emoji !== emoji) };
            }
            return { ...c, reactions: reactions.map(r => r.emoji === emoji ? { ...r, userIds: newUserIds } : r) };
          } else {
            return { ...c, reactions: reactions.map(r => r.emoji === emoji ? { ...r, userIds: [...r.userIds, userId] } : r) };
          }
        } else {
          return { ...c, reactions: [...reactions, { emoji, userIds: [userId] }] };
        }
      }),
    }));

    // ---- Persist to PostgreSQL ----
    // The reaction API is idempotent on add and tolerates a missing row on
    // delete, so on failure we simply roll back to the captured pre-toggle
    // snapshot (which also restores the exact same state if the network
    // call never reached the server).
    const persist = isAdding
      ? apiAddReaction(commentId, emoji)
      : apiRemoveReaction(commentId, emoji);

    persist.then((res) => {
      if (res.ok) return;
      // Roll back the optimistic update for this one comment.
      setCommentsByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(c =>
          c.id === commentId ? { ...c, reactions: reactionsBefore } : c
        ),
      }));
      toast.error('Failed to update reaction', { description: res.error });
    });
  }, [commentsByProject]);

  /* ---- Followers ---- */
  const toggleFollower = useCallback((projectId: string, taskId: string, userId: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === taskId);
    if (!task) return;
    const current = task.followers || [];
    const isFollowing = current.includes(userId);
    const newFollowers = isFollowing
      ? current.filter(u => u !== userId)
      : [...current, userId];
    // Snapshot for rollback — restore the pre-toggle followers if the API
    // rejects the change.
    const snapshot = projectTasks;
    // Optimistic local update.
    commit(projectId, projectTasks.map(t => t.id === taskId ? { ...t, followers: newFollowers } : t));
    const member = TEAM.find(m => m.id === userId);
    const memberName = member?.name || 'Someone';
    logActivity(projectId, taskId, 'comment', `${memberName} ${isFollowing ? 'stopped following' : 'is now following'} this task`);
    // Persist to PostgreSQL.
    const persist = isFollowing ? apiUnfollowTask(taskId) : apiFollowTask(taskId);
    persist.then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error(isFollowing ? 'Failed to unfollow task' : 'Failed to follow task', { description: res.error });
    });
  }, [tasksByProject, commit, logActivity]);

  /* ---- Time Logs ---- */
  const addTimeLog = useCallback((projectId: string, taskId: string, minutes: number, note: string) => {
    if (!projectId || minutes <= 0) return;
    // Optimistic local insert with a temporary client-only id. If the server
    // responds successfully we swap the temp id for the canonical server id;
    // on failure we remove the entry and surface an error toast.
    const tempId = defaultIdGenerator.generate('tl');
    const entry: TimeLog = {
      id: tempId,
      taskId, userId: userIdRef.current, minutes, note: note.trim(),
      loggedAt: new Date().toISOString(),
    };
    setTimeLogsByProject(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), entry],
    }));

    apiAddTimeLog(taskId, { minutes, note: note.trim() || undefined }).then(async (res) => {
      if (!res.ok) {
        // Roll back the optimistic add.
        setTimeLogsByProject(prev => ({
          ...prev,
          [projectId]: (prev[projectId] || []).filter(tl => tl.id !== tempId),
        }));
        toast.error('Failed to save time log', { description: res.error });
        return;
      }
      // Reconcile the canonical server id (if returned) so subsequent
      // deletes/mutations target the right row.
      const serverId = res.data?.timeLog?.id;
      if (serverId && serverId !== tempId) {
        setTimeLogsByProject(prev => ({
          ...prev,
          [projectId]: (prev[projectId] || []).map(tl =>
            tl.id === tempId ? { ...tl, id: serverId } : tl
          ),
        }));
        return;
      }
      // Fallback: if the API didn't return the id in the body, refetch the
      // list and match by minutes/note/user. This is a safety net — the
      // route returns the created row, so this branch rarely runs.
      try {
        const data = await fetch(`/api/tasks/${taskId}/time-logs`).then(r => r.ok ? r.json() : null);
        const serverLog = (data?.timeLogs ?? []).find((tl: { id: string; userId?: string | null; minutes: number; note?: string | null; loggedAt: string }) =>
          tl.minutes === minutes &&
          (tl.note ?? '') === (note.trim() || '') &&
          (tl.userId ?? '') === userIdRef.current,
        );
        if (serverLog?.id && serverLog.id !== tempId) {
          setTimeLogsByProject(prev => ({
            ...prev,
            [projectId]: (prev[projectId] || []).map(tl =>
              tl.id === tempId ? { ...tl, id: serverLog.id } : tl
            ),
          }));
        }
      } catch {
        // Refetch failed — leave the temp id in place; the entry is still
        // visible locally and will be reconciled on the next full project load.
      }
    });
  }, []);

  const deleteTimeLog = useCallback((projectId: string, timeLogId: string) => {
    if (!projectId) return;
    // Optimistic local delete with rollback.
    const projectTimeLogs = timeLogsByProject[projectId] || [];
    const removed = projectTimeLogs.find(tl => tl.id === timeLogId);
    if (!removed) return;

    setTimeLogsByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(tl => tl.id !== timeLogId),
    }));

    apiDeleteTimeLog(removed.taskId, timeLogId).then((res) => {
      if (res.ok) return;
      // Roll back the optimistic delete.
      setTimeLogsByProject(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), removed].sort((a, b) =>
          a.loggedAt.localeCompare(b.loggedAt),
        ),
      }));
      toast.error('Failed to delete time log', { description: res.error });
    });
  }, [timeLogsByProject]);

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
    onAddTask: (pid) => { if (pid) setShowNewTask(true); },
    onBulkAssign: (pid, memberId) => bulkAssign(pid, selectedIds, memberId),
    onSetRecurrence: setRecurrenceSelected,
    onUndo: undo, onRedo: redo, canUndo: past.length > 0, canRedo: future.length > 0,
    onIndent: indentSelected, onOutdent: outdentSelected,
    onLink: linkSelected, onUnlink: unlinkSelected,
    onDeleteSelected: (pid) => removeTasksBulk(pid, selectedIds),
    onToggleBold: toggleBoldSelected,
    onSetColor: setColorSelected,
    durationUnit, onToggleDurationUnit: () => setDurationUnit(u => u === 'days' ? 'hours' : 'days'),
    onToggleMilestone: toggleMilestoneSelected,
    onImportCSV: importCSV, onExportCSV: exportCSV, onPrint: () => window.print(),
    onCut: cutSelected, onCopy: copySelected, onPaste: paste, canPaste: clipboard.items.length > 0,
    onAttachFiles: attachFilesToSelected,
    customCols, onAddColumn: addColumn, onRemoveColumn: removeColumn,
    onOpenShare: (pid) => { if (pid) setShareOpen(true); },
  }), [selectedIds, bulkAssign, setRecurrenceSelected, undo, redo, past.length, future.length,
    indentSelected, outdentSelected, linkSelected, unlinkSelected, removeTasksBulk,
    toggleBoldSelected, setColorSelected, durationUnit, toggleMilestoneSelected,
    importCSV, exportCSV, cutSelected, copySelected, paste, clipboard.items,
    attachFilesToSelected, customCols, addColumn, removeColumn]);

  /* ---- #30: Duplicate task with options ---- */
  const duplicateTaskWithOptions = useCallback((projectId: string, id: string, opts?: { includeSubtasks?: boolean; includeComments?: boolean; includeAttachments?: boolean }) => {
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === id);
    if (!task) return;
    // Snapshot for rollback — restore the pre-duplicate task list if the
    // server rejects the new task creation.
    const snapshot = projectTasks;
    const newId = defaultIdGenerator.generate('t');
    const idMap = new Map<string, string>();
    idMap.set(id, newId);

    const cloneBase: Task = {
      ...task,
      id: newId,
      projectId,
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
      const subtasks = projectTasks.filter(t => t.parentId === id);
      for (const sub of subtasks) {
        const subId = defaultIdGenerator.generate('t');
        idMap.set(sub.id, subId);
        newTasks.push({
          ...sub,
          id: subId,
          projectId,
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

    commit(projectId, [...projectTasks, ...newTasks]);

    /* Deep clone comments */
    if (opts?.includeComments) {
      const taskComments = (commentsByProject[projectId] || []).filter(c => c.taskId === id);
      if (taskComments.length) {
        const clonedComments = taskComments.map(c => ({
          id: defaultIdGenerator.generate('c'),
          taskId: newId,
          authorId: c.authorId,
          text: c.text,
          createdAt: new Date().toISOString(),
        }));
        setCommentsByProject(prev => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), ...clonedComments],
        }));
      }
    }

    /* Deep clone attachments (file links only — can't clone blob URLs) */
    if (opts?.includeAttachments) {
      const taskFiles = (filesByProject[projectId] || []).filter(f => f.linkedTaskId === id);
      if (taskFiles.length) {
        const clonedFiles = taskFiles.map(f => ({
          ...f,
          id: defaultIdGenerator.generate('f'),
          linkedTaskId: newId,
        }));
        setFilesByProject(prev => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), ...clonedFiles],
        }));
      }
    }

    logActivity(projectId, newId, 'created', `Task "${cloneBase.name}" was created`);
    toast.success('Task duplicated', { description: cloneBase.name });

    // Persist the duplicate to PostgreSQL via POST /api/projects/:id/tasks.
    // The server creates one task per call; we issue the parent first, then
    // each subtask in parallel (with parentId set to the server-side parent).
    // Subtask/comments/files copy is best-effort — failures roll back the
    // parent task but leave the subtask copies to be reconciled on the next
    // project load.
    const persistClone = async (
      source: Task,
      serverParentId: string | null,
      tempCloneId: string,
    ): Promise<string | null> => {
      const res = await apiCreateTask(projectId, {
        name: source.name + ' (copy)',
        description: source.description,
        status: 'backlog',
        priority: source.priority,
        assigneeId: source.assignee,
        parentId: serverParentId,
        sectionId: source.sectionId,
        dueDate: source.dueDate,
        startDate: source.start,
        duration: source.duration,
      });
      if (!res.ok) return null;
      const serverId = res.data?.task?.id;
      if (serverId && serverId !== tempCloneId) {
        setTasksByProject(prev => {
          const list = prev[projectId] || [];
          return { ...prev, [projectId]: list.map(t => t.id === tempCloneId ? { ...t, id: serverId } : t) };
        });
      }
      return serverId ?? tempCloneId;
    };

    persistClone(task, null, newId).then((serverParentId) => {
      if (!serverParentId) {
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to duplicate task on server');
        return;
      }
      // Persist subtasks (if requested) in parallel, using the server
      // parent id so the relational integrity check on the server passes.
      if (opts?.includeSubtasks) {
        const subtasks = projectTasks.filter(t => t.parentId === id);
        const subCloneIds = newTasks.filter(t => t.id !== newId).map(t => t.id);
        Promise.all(
          subtasks.map((sub, i) =>
            persistClone(sub, serverParentId, subCloneIds[i] ?? sub.id),
          ),
        ).then((results) => {
          const failures = results.filter(r => r === null).length;
          if (failures > 0) {
            toast.error(`Failed to duplicate ${failures} subtask${failures > 1 ? 's' : ''} on server`);
          }
        });
      }
    });
  }, [tasksByProject, commit, logActivity, commentsByProject, filesByProject]);

  /* Keep simple duplicateTask as a thin wrapper */
  const duplicateTask = useCallback((projectId: string, id: string) => duplicateTaskWithOptions(projectId, id), [duplicateTaskWithOptions]);

  /* Bulk duplicate selected tasks */
  const duplicateTasksBulk = useCallback((projectId: string, ids: Set<string>) => {
    const projectTasks = tasksByProject[projectId] || [];
    let newTasks: Task[] = [];
    for (const id of ids) {
      const task = projectTasks.find(t => t.id === id);
      if (!task) continue;
      newTasks.push({
        ...task,
        id: defaultIdGenerator.generate('t'),
        projectId,
        name: task.name + ' (copy)',
        status: 'backlog', progress: 0, deps: [],
        tags: [...(task.tags || [])],
        followers: [...(task.followers || [])],
        customFields: task.customFields ? { ...task.customFields } : undefined,
        createdAt: new Date().toISOString(),
      });
    }
    if (newTasks.length) {
      commit(projectId, [...projectTasks, ...newTasks]);
      toast.success(`${newTasks.length} task${newTasks.length > 1 ? 's' : ''} duplicated`);
    }
  }, [tasksByProject, commit]);

  /* ---- #32: Move task to another project ---- */
  const moveTaskToProject = useCallback((projectId: string, taskId: string, targetProjectId: string) => {
    if (!projectId || targetProjectId === projectId) return;
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === taskId);
    if (!task) return;
    /* Collect task + all subtasks */
    const idsToMove = new Set<string>();
    const collectDescendants = (parentId: string) => {
      for (const t of projectTasks) {
        if (t.parentId === parentId && !idsToMove.has(t.id)) {
          idsToMove.add(t.id);
          collectDescendants(t.id);
        }
      }
    };
    idsToMove.add(taskId);
    collectDescendants(taskId);
    const tasksToMove = projectTasks.filter(t => idsToMove.has(t.id)).map(t => ({ ...t, projectId: targetProjectId }));

    /* Snapshot for rollback — we capture the full pre-move state for both
     * projects so we can restore them if the bulk-move API fails. */
    const snapshotSource = projectTasks;
    const snapshotTarget = tasksByProject[targetProjectId] || [];
    const snapshotComments = commentsByProject[projectId] || [];
    const snapshotCommentsTarget = commentsByProject[targetProjectId] || [];
    const snapshotActivity = activityByProject[projectId] || [];
    const snapshotActivityTarget = activityByProject[targetProjectId] || [];
    const snapshotTimeLogs = timeLogsByProject[projectId] || [];
    const snapshotTimeLogsTarget = timeLogsByProject[targetProjectId] || [];
    const snapshotFiles = filesByProject[projectId] || [];
    const snapshotFilesTarget = filesByProject[targetProjectId] || [];
    const snapshotSelection = new Set(selectedIds);
    const snapshotSelectedTaskId = selectedTaskId;

    /* Remove from current project */
    setTasksByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(t => !idsToMove.has(t.id)) }));
    /* Add to target project */
    setTasksByProject(prev => ({ ...prev, [targetProjectId]: [...(prev[targetProjectId] || []), ...tasksToMove] }));
    /* Move associated comments */
    const commentsToMove = (commentsByProject[projectId] || []).filter(c => idsToMove.has(c.taskId));
    if (commentsToMove.length) {
      setCommentsByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(c => !idsToMove.has(c.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...commentsToMove],
      }));
    }
    /* Move associated activity */
    const activityToMove = (activityByProject[projectId] || []).filter(a => idsToMove.has(a.taskId));
    if (activityToMove.length) {
      setActivityByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(a => !idsToMove.has(a.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...activityToMove],
      }));
    }
    /* Move associated time logs */
    const timeLogsToMove = (timeLogsByProject[projectId] || []).filter(tl => idsToMove.has(tl.taskId));
    if (timeLogsToMove.length) {
      setTimeLogsByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(tl => !idsToMove.has(tl.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...timeLogsToMove],
      }));
    }
    /* Move associated files */
    const filesToMove = (filesByProject[projectId] || []).filter(f => idsToMove.has(f.linkedTaskId || ''));
    if (filesToMove.length) {
      setFilesByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(f => !idsToMove.has(f.linkedTaskId || '')),
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

    // Persist to PostgreSQL via the bulk move action. On failure, restore
    // the pre-move snapshots for both projects' task lists, comments,
    // activity, time logs, files, and the selection state.
    apiBulkAction(projectId, 'move', [...idsToMove], { targetProjectId }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshotSource, [targetProjectId]: snapshotTarget }));
      setCommentsByProject(prev => ({ ...prev, [projectId]: snapshotComments, [targetProjectId]: snapshotCommentsTarget }));
      setActivityByProject(prev => ({ ...prev, [projectId]: snapshotActivity, [targetProjectId]: snapshotActivityTarget }));
      setTimeLogsByProject(prev => ({ ...prev, [projectId]: snapshotTimeLogs, [targetProjectId]: snapshotTimeLogsTarget }));
      setFilesByProject(prev => ({ ...prev, [projectId]: snapshotFiles, [targetProjectId]: snapshotFilesTarget }));
      setSelectedIds(snapshotSelection);
      setSelectedTaskId(snapshotSelectedTaskId);
      toast.error('Failed to move task', { description: res.error });
    });
  }, [tasksByProject, selectedIds, selectedTaskId, commentsByProject, activityByProject, timeLogsByProject, filesByProject, projects]);

  /* Bulk move selected tasks to another project */
  const moveTasksToProjectBulk = useCallback((projectId: string, ids: Set<string>, targetProjectId: string) => {
    if (!projectId || targetProjectId === projectId) return;
    const projectTasks = tasksByProject[projectId] || [];
    const tasksToMove = projectTasks.filter(t => ids.has(t.id)).map(t => ({ ...t, projectId: targetProjectId }));
    if (!tasksToMove.length) return;

    // Snapshot for rollback.
    const snapshotSource = projectTasks;
    const snapshotTarget = tasksByProject[targetProjectId] || [];
    const snapshotComments = commentsByProject[projectId] || [];
    const snapshotCommentsTarget = commentsByProject[targetProjectId] || [];
    const snapshotActivity = activityByProject[projectId] || [];
    const snapshotActivityTarget = activityByProject[targetProjectId] || [];
    const snapshotTimeLogs = timeLogsByProject[projectId] || [];
    const snapshotTimeLogsTarget = timeLogsByProject[targetProjectId] || [];
    const snapshotFiles = filesByProject[projectId] || [];
    const snapshotFilesTarget = filesByProject[targetProjectId] || [];
    const snapshotSelection = new Set(selectedIds);

    setTasksByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(t => !ids.has(t.id)),
      [targetProjectId]: [...(prev[targetProjectId] || []), ...tasksToMove],
    }));

    const commentsToMove = (commentsByProject[projectId] || []).filter(c => ids.has(c.taskId));
    if (commentsToMove.length) {
      setCommentsByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(c => !ids.has(c.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...commentsToMove],
      }));
    }
    const activityToMove = (activityByProject[projectId] || []).filter(a => ids.has(a.taskId));
    if (activityToMove.length) {
      setActivityByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(a => !ids.has(a.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...activityToMove],
      }));
    }
    const timeLogsToMove = (timeLogsByProject[projectId] || []).filter(tl => ids.has(tl.taskId));
    if (timeLogsToMove.length) {
      setTimeLogsByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(tl => !ids.has(tl.taskId)),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...timeLogsToMove],
      }));
    }
    const filesToMove = (filesByProject[projectId] || []).filter(f => ids.has(f.linkedTaskId || ''));
    if (filesToMove.length) {
      setFilesByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(f => !ids.has(f.linkedTaskId || '')),
        [targetProjectId]: [...(prev[targetProjectId] || []), ...filesToMove],
      }));
    }
    setSelectedIds(new Set());
    const targetName = projects[targetProjectId]?.name || 'Project';
    toast.success(`${ids.size} task${ids.size > 1 ? 's' : ''} moved to ${targetName}`);

    apiBulkAction(projectId, 'move', [...ids], { targetProjectId }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshotSource, [targetProjectId]: snapshotTarget }));
      setCommentsByProject(prev => ({ ...prev, [projectId]: snapshotComments, [targetProjectId]: snapshotCommentsTarget }));
      setActivityByProject(prev => ({ ...prev, [projectId]: snapshotActivity, [targetProjectId]: snapshotActivityTarget }));
      setTimeLogsByProject(prev => ({ ...prev, [projectId]: snapshotTimeLogs, [targetProjectId]: snapshotTimeLogsTarget }));
      setFilesByProject(prev => ({ ...prev, [projectId]: snapshotFiles, [targetProjectId]: snapshotFilesTarget }));
      setSelectedIds(snapshotSelection);
      toast.error('Failed to move tasks', { description: res.error });
    });
  }, [tasksByProject, commentsByProject, activityByProject, timeLogsByProject, filesByProject, projects, selectedIds]);

  /* ---- #33: Promote subtask to top-level ---- */
  const promoteSubtask = useCallback((projectId: string, taskId: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === taskId);
    if (!task || !task.parentId) return;
    const newLevel = Math.max(0, (task.level || 1) - 1);
    const snapshot = projectTasks;
    // Optimistic local update.
    commit(projectId, projectTasks.map(t => t.id === taskId ? { ...t, parentId: null, level: newLevel } : t));
    const member = TEAM.find(m => m.id === userIdRef.current);
    logActivity(projectId, taskId, 'created', `${member?.name || 'Someone'} promoted subtask to top-level`);
    toast.success('Subtask promoted', { description: task.name });
    // Persist to PostgreSQL — clearing parentId promotes the task.
    apiUpdateTask(taskId, { parentId: null }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to promote subtask', { description: res.error });
    });
  }, [tasksByProject, commit, logActivity]);

  /* ---- #33: Demote task to subtask ---- */
  const demoteToSubtask = useCallback((projectId: string, taskId: string, newParentId: string) => {
    if (taskId === newParentId) return;
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === taskId);
    if (!task) return;
    const newLevel = Math.min(4, (task.level || 0) + 1);
    const snapshot = projectTasks;
    // Optimistic local update.
    commit(projectId, projectTasks.map(t => t.id === taskId ? { ...t, parentId: newParentId, level: newLevel } : t));
    const parentTask = projectTasks.find(t => t.id === newParentId);
    const member = TEAM.find(m => m.id === userIdRef.current);
    logActivity(projectId, taskId, 'created', `${member?.name || 'Someone'} converted task to subtask of "${parentTask?.name || 'task'}"`);
    toast.success('Converted to subtask', { description: task.name });
    // Persist to PostgreSQL — setting parentId demotes the task under the
    // new parent. The server enforces no-self-parent and no-circular
    // hierarchy, so on a 400 we roll back the optimistic change.
    apiUpdateTask(taskId, { parentId: newParentId }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to convert task to subtask', { description: res.error });
    });
  }, [tasksByProject, commit, logActivity]);

  /* ---- #34: Bulk set due date / add tag / set status ---- */
  /* ---- #35: Sections ---- */
  const addSection = useCallback((projectId: string, name: string) => {
    if (!projectId) return;
    const id = defaultIdGenerator.generate('sec');
    const currentSections = sectionsByProject[projectId] || [];
    const newSection: Section = { id, projectId, name, position: currentSections.length, collapsed: false };
    // Optimistic local update.
    setSectionsByProject(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), newSection] }));
    toast.success('Section added', { description: name });
    // Persist to PostgreSQL.
    apiCreateSection(projectId, name).then((res) => {
      if (!res.ok) toast.error('Failed to create section on server', { description: res.error });
    });
  }, [sectionsByProject]);

  const renameSection = useCallback((projectId: string, sectionId: string, name: string) => {
    if (!projectId) return;
    setSectionsByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(s => s.id === sectionId ? { ...s, name } : s),
    }));
  }, []);

  const deleteSection = useCallback((projectId: string, sectionId: string) => {
    if (!projectId) return;
    const projectTasks = tasksByProject[projectId] || [];
    // Optimistic local update.
    commit(projectId, projectTasks.map(t => t.sectionId === sectionId ? { ...t, sectionId: null } : t));
    setSectionsByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(s => s.id !== sectionId),
    }));
    toast.success('Section removed');
    // Persist to PostgreSQL.
    apiDeleteSection(projectId, sectionId).then((res) => {
      if (!res.ok) toast.error('Failed to delete section on server', { description: res.error });
    });
  }, [tasksByProject, commit]);

  const toggleSectionCollapsed = useCallback((projectId: string, sectionId: string) => {
    if (!projectId) return;
    setSectionsByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(s => s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s),
    }));
  }, []);

  const reorderSection = useCallback((projectId: string, sectionId: string, toIndex: number) => {
    if (!projectId) return;
    const currentSections = [...(sectionsByProject[projectId] || [])];
    const idx = currentSections.findIndex(s => s.id === sectionId);
    if (idx === -1 || idx === toIndex) return;
    const [removed] = currentSections.splice(idx, 1);
    currentSections.splice(toIndex, 0, removed);
    /* Re-number positions */
    const renumbered = currentSections.map((s, i) => ({ ...s, position: i }));
    setSectionsByProject(prev => ({ ...prev, [projectId]: renumbered }));
  }, [sectionsByProject]);

  const setTaskSection = useCallback((projectId: string, taskId: string, sectionId: string | null) => {
    const projectTasks = tasksByProject[projectId] || [];
    commit(projectId, projectTasks.map(t => t.id === taskId ? { ...t, sectionId } : t));
  }, [tasksByProject, commit]);

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

  const addProjectStatusUpdate = useCallback((projectId: string, text: string, color: 'green' | 'yellow' | 'red') => {
    if (!projectId) return;
    const id = defaultIdGenerator.generate('su');
    const update: ProjectStatusUpdate = {
      id, projectId: projectId, authorId: userIdRef.current,
      text, color, createdAt: new Date().toISOString(),
    };
    setStatusUpdatesByProject(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), update],
    }));
    toast.success('Status update posted');
  }, []);

  const deleteProjectStatusUpdate = useCallback((projectId: string, id: string) => {
    if (!projectId) return;
    setStatusUpdatesByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(su => su.id !== id),
    }));
  }, []);

  const saveProjectAsTemplate = useCallback((projectId: string, name: string, includeTasks: boolean) => {
    if (!projectId) return;
    const p = projects[projectId];
    if (!p) return;
    const tid = defaultIdGenerator.generate('tpl');
    const taskList = includeTasks ? (tasksByProject[projectId] || []) : [];
    const tagList = (tagsByProject[projectId] || []).map(t => ({ name: t.name, color: t.color }));
    const colsList = customColsByProject[projectId] || [];
    /* Save custom template to storage adapter */
    try {
      const existing = loadCustomTemplates();
      existing.push({
        id: tid, name, description: p.description || '', icon: '📁', color: p.color,
        taskCount: taskList.length, tags: tagList, customCols: colsList,
        tasks: taskList.map(t => ({ ...t, id: '', parentId: null, createdAt: undefined })),
        createdAt: new Date().toISOString(),
      });
      saveCustomTemplates(existing);
      toast.success(`Template "${name}" saved`);
    } catch { toast.error('Failed to save template'); }
  }, [projects, tasksByProject, tagsByProject, customColsByProject]);

  /* ---- #47: Goals / OKRs ---- */
  const addGoal = useCallback((goal: Goal) => { setGoals(prev => [...prev, goal]); toast.success('Goal added'); }, []);
  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => { setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g)); }, []);
  const deleteGoal = useCallback((id: string) => { setGoals(prev => prev.filter(g => g.id !== id)); setKeyResults(prev => prev.filter(kr => kr.goalId !== id)); toast.success('Goal deleted'); }, []);
  const addKeyResult = useCallback((kr: KeyResult) => { setKeyResults(prev => [...prev, kr]); }, []);
  const updateKeyResult = useCallback((id: string, patch: Partial<KeyResult>) => { setKeyResults(prev => prev.map(kr => kr.id === id ? { ...kr, ...patch } : kr)); }, []);
  const deleteKeyResult = useCallback((id: string) => { setKeyResults(prev => prev.filter(kr => kr.id !== id)); }, []);

  /* ---- #49: Saved Filters ---- */
  const saveFilter = useCallback((name: string, filters: SearchFilters) => {
    const sf: SavedFilter = { id: defaultIdGenerator.generate('sf'), name, filters, createdAt: new Date().toISOString() };
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
                  if (action.type === 'set_status' && action.value) patch.status = action.value as TaskStatus;
                  if (action.type === 'set_priority' && action.value) patch.priority = action.value as TaskPriority;
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
          id: defaultIdGenerator.generate('t'),
          projectId: pid,
          name: taskName,
          status: 'backlog',
          assignee: userIdRef.current,
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
    statusUpdatesByProject,
    tagsByProject, commentsByProject, activityByProject, timeLogsByProject, sectionsByProject,
    currentUserId,
    setCurrentUserId,
    currentProjectId, activeView, selectedTaskId, selectedIds, searchQuery,
    showNewTask, showNewProject, projectMenuOpen, shareOpen, sidebarOpen, moreMenuOpen,
    durationUnit, clipboard, past, future,
    viewingFileId, setViewingFileId,
    project, tasks, files, raidItems, customCols, filteredTasks, selectedTask, viewingFile,
    tags, taskComments, taskActivity,
    searchFilters, setSearchFilters, activeFilterCount, clearFilters,
    timeLogs, taskTimeLogs,
    gridActions,
    openProject, syncProjectFromRoute, syncProjectTasks, syncProjectTags, syncProjectComments, syncProjectFiles, syncProjects, upsertProject, goToPortfolio, createProject, createProjectFromTemplate, deleteProject,
    updateTask, addTask, removeTask, removeTasksBulk, moveStatus, toggleComplete,
    duplicateTask, duplicateTaskWithOptions, duplicateTasksBulk,
    moveTaskToProject, moveTasksToProjectBulk,
    promoteSubtask, demoteToSubtask,
    bulkSetDueDate, bulkAddTag, bulkRemoveTag, bulkSetStatus, bulkAssign, bulkSetPriority, bulkComplete,
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
      clearPersistedState();
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

  if (!context) {
    throw new Error(
      'useFlowDeck must be used within a FlowdekDataProvider'
    );
  }

  return context;
}
