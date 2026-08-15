'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import {
  STATUS_META, PRIORITY_META, TEAM, TODAY,
  INITIAL_PROJECTS, initialTasks, initialFiles, initialRaid,
  INITIAL_TAGS, initialComments, initialTimeLogs, CURRENT_USER_ID,
  PROJECT_TEMPLATES,
  FONT_FAMILY as FF,
  type Task, type Project, type FileItem, type RaidItem, type CustomColumn, type TaskStatus, type TaskPriority,
  type Tag, type Comment, type ActivityEntry, type TimeLog, type SearchFilters, type Section, type Reaction, type Goal, type KeyResult, type SavedFilter, EMPTY_FILTERS,
  type AutomationRule, type Form, type FormSubmission, type ApprovalRequest, type Budget, type Expense, type TimesheetEntry, type CreateTaskInput,
  type MemberInfo,
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
  apiCreateSection, apiDeleteSection, apiUpdateSection,
  apiCreateTag, apiDeleteTag,
  apiAddDependency, apiRemoveDependency,
  apiAddTimeLog, apiDeleteTimeLog,
  apiUpdateProject, apiSetProjectFavorite, apiArchiveProject, apiRestoreProject,
  apiAddProjectMember, apiRemoveProjectMember,
  apiCreateProjectStatusUpdate, apiDeleteProjectStatusUpdate,
  apiReorderTasks,
  apiSetTaskCustomField,
  apiCreateCustomField, apiDeleteCustomField,
  taskToApiPayload,
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
  /**
   * Display name of the authenticated user (set from session.user.name by
   * FlowdekDataProvider). Used for activity-log messages + CSV export when
   * the actor is the current user. Falls back to 'Someone' if unset.
   */
  currentUserName: string;
  setCurrentUserName: (name: string) => void;
  /**
   * Global `userId → MemberInfo` map aggregated from every project the user
   * has opened. Populated by `registerMembers` (called by
   * `useProjectMembers` whenever the members API responds) and used by the
   * store for activity-log names, CSV name→id mapping, and assignee-name
   * search. Components read this via the `MemberDirectory` context's
   * `lookup()` helper.
   */
  membersById: Record<string, MemberInfo>;
  registerMembers: (members: MemberInfo[]) => void;

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
  /** Replace a project's custom-field column definitions with API data. */
  syncProjectCustomCols: (projectId: string, cols: CustomColumn[]) => void;
  /** Replace a project's comments with API data. */
  syncProjectComments: (projectId: string, comments: Comment[]) => void;
  /** Replace a project's files with API data. */
  syncProjectFiles: (projectId: string, files: FileItem[]) => void;
  /**
   * Replace a project's member id list with API data. One-way sync — does
   * NOT call the API (used by `useProjectMembers` to populate the local
   * cache from the server's response). For user-initiated member changes,
   * use `setProjectMembers` (which diffs + calls POST/DELETE per member).
   */
  syncProjectMembers: (projectId: string, memberUserIds: string[]) => void;
  /**
   * Replace a project's status updates with API data. One-way sync from the
   * server — does NOT call the API.
   */
  syncProjectStatusUpdates: (projectId: string, updates: ProjectStatusUpdate[]) => void;
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
  /** Remove a server-deleted project from shared client state. */
  removeProjectFromCache: (projectId: string) => void;
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
  /* ---- Hydration-safe initial state ----
   *
   * FCP-5: the authenticated production app MUST NOT seed business data from
   * the mock fixtures. All collections start empty — real data is fetched
   * from the API on demand (useProjects, useProjectTasks, useProjectTags,
   * useProjectComments, useProjectFiles, useStatusUpdates, useMyTasks, …).
   *
   * Demo fixtures are only used when the build explicitly opts in via
   * `NEXT_PUBLIC_DEMO_MODE=true` AND `NODE_ENV === 'development'`. This
   * keeps the legacy mock-only dev workflow working without leaking demo
   * data into production builds.
   */
  const isDemoMode =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const persistedRef = useRef<Record<string, unknown> | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [projects, setProjects] = useState<Record<string, Project>>(
    isDemoMode ? INITIAL_PROJECTS : {},
  );
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>(
    isDemoMode ? initialTasks : {},
  );
  const [filesByProject, setFilesByProject] = useState<Record<string, FileItem[]>>(
    isDemoMode ? initialFiles : {},
  );
  const [raidByProject, setRaidByProject] = useState<Record<string, RaidItem[]>>(
    isDemoMode ? initialRaid : {},
  );
  const [customColsByProject, setCustomColsByProject] = useState<Record<string, CustomColumn[]>>({});
  const [tagsByProject, setTagsByProject] = useState<Record<string, Tag[]>>(
    isDemoMode ? INITIAL_TAGS : {},
  );
  const [commentsByProject, setCommentsByProject] = useState<Record<string, Comment[]>>(
    isDemoMode ? initialComments : {},
  );

  /* Load ONLY UI preferences from localStorage on mount.
   *
   * FCP-5: business data (projects, tasks, comments, tags, time logs,
   * goals, automations, approvals, budgets, expenses, timesheets, …) is
   * server-owned and must NOT be restored from localStorage — doing so
   * would resurrect stale data after the server has moved on (deleted
   * tasks, renamed projects, offboarded members, etc.). The only things
   * we restore are pure UI preferences that don't reflect business state.
   */
  useEffect(() => {
    const persisted = loadPersistedState();
    persistedRef.current = persisted;
    if (persisted) {
      if (persisted.currentProjectId) setCurrentProjectId(persisted.currentProjectId as string | null);
      if (persisted.activeView) setActiveView(persisted.activeView as string);
    }
    setHydrated(true);
  }, []);

  const [activityByProject, setActivityByProject] = useState<Record<string, ActivityEntry[]>>({});

  // Authenticated user identity. Starts empty in production (the session
  // is the source of truth and is set via setCurrentUserId() in
  // FlowdekDataProvider on mount). In demo/dev mode the legacy
  // CURRENT_USER_ID constant is used as a fallback so the mock-only
  // workflow still resolves the current user before the session hydrates.
  const [currentUserId, setCurrentUserIdState] = useState<string>(
    isDemoMode ? CURRENT_USER_ID : '',
  );
  const userIdRef = useRef(currentUserId);
  userIdRef.current = currentUserId;
  const setCurrentUserId = useCallback((id: string) => {
    userIdRef.current = id;
    setCurrentUserIdState(id);
  }, []);

  /**
   * Display name of the authenticated user (set from session.user.name by
   * FlowdekDataProvider). Used for activity-log messages so they read
   * naturally even before the MemberDirectory hydrates with real members.
   */
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const userNameRef = useRef(currentUserName);
  userNameRef.current = currentUserName;

  /**
   * Global `userId → MemberInfo` map aggregated from every project the user
   * has opened. Used by:
   *   - the store (CSV name→id mapping, activity-log actor names, filtered
   *     task search by assignee name)
   *   - the MemberDirectory context (`lookup()` helper for Avatar + activity
   *     labels)
   *
   * FCP-5: starts empty in production. The map is populated on demand by
   * `useProjectMembers` whenever a project is opened. In demo/dev mode it
   * is seeded with the mock TEAM so the legacy demo data still renders
   * before the members API responds (the seeded entries get overwritten by
   * real data the first time `useProjectMembers` runs for any project).
   */
  const [membersById, setMembersById] = useState<Record<string, MemberInfo>>(
    () => isDemoMode
      ? Object.fromEntries(TEAM.map(m => [m.id, { id: m.id, name: m.name, role: m.role, color: m.color }]))
      : {},
  );
  const membersRef = useRef(membersById);
  membersRef.current = membersById;
  const registerMembers = useCallback((members: MemberInfo[]) => {
    setMembersById(prev => {
      let changed = false;
      const next = { ...prev };
      for (const m of members) {
        const existing = next[m.id];
        if (!existing || existing.name !== m.name || existing.color !== m.color || existing.role !== m.role) {
          next[m.id] = m;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  /**
   * Resolve a user id to a display name for activity-log messages + toasts.
   * Order of precedence:
   *   1. The store's `membersById` map (populated by `useProjectMembers`)
   *   2. The current user's session name (when the id is the current user)
   *   3. The generic 'Someone' fallback
   *
   * This replaces the old `TEAM.find(m => m.id === X)?.name || 'Someone'`
   * pattern so activity logs + toasts use real member data once it's loaded.
   */
  const resolveMemberName = useCallback((id: string): string => {
    const known = membersRef.current[id];
    if (known?.name) return known.name;
    if (id === userIdRef.current && userNameRef.current) return userNameRef.current;
    return 'Someone';
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
  const [timeLogsByProject, setTimeLogsByProject] = useState<Record<string, TimeLog[]>>(
    isDemoMode ? initialTimeLogs : {},
  );
  const [sectionsByProject, setSectionsByProject] = useState<Record<string, Section[]>>({});
  const [statusUpdatesByProject, setStatusUpdatesByProject] = useState<Record<string, ProjectStatusUpdate[]>>({});

  /* #47: Goals & Key Results
   *
   * FCP-5: starts empty in production. Goals/key results are server-owned
   * (Goal.workspaceId FK was added in FCP-4-2-6-10) and are fetched on
   * demand from the API. The legacy demo seed only runs in explicit
   * demo/dev mode. */
  const [goals, setGoals] = useState<Goal[]>(
    isDemoMode
      ? [
          { id: 'g1', title: 'Improve Website Performance', status: 'on_track', startDate: '2026-07-01', endDate: '2026-09-30', linkedProjectIds: ['p1'] },
          { id: 'g2', title: 'Launch Mobile App MVP', status: 'at_risk', startDate: '2026-08-01', endDate: '2026-12-31', linkedProjectIds: ['p2'] },
        ]
      : [],
  );
  const [keyResults, setKeyResults] = useState<KeyResult[]>(
    isDemoMode
      ? [
          { id: 'kr1', goalId: 'g1', title: 'Reduce page load time to under 2 seconds', targetValue: 2, currentValue: 3.5, unit: 'seconds' },
          { id: 'kr2', goalId: 'g1', title: 'Achieve 90+ Lighthouse performance score', targetValue: 90, currentValue: 72, unit: 'score' },
          { id: 'kr3', goalId: 'g1', title: 'Zero critical accessibility issues', targetValue: 0, currentValue: 3, unit: 'issues' },
          { id: 'kr4', goalId: 'g2', title: 'Complete core user flows', targetValue: 5, currentValue: 2, unit: 'flows' },
          { id: 'kr5', goalId: 'g2', title: 'Pass App Store review', targetValue: 1, currentValue: 0, unit: 'submission' },
        ]
      : [],
  );

  /* #49: Saved Filters */
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  /* Automations.
   *
   * FCP-5: starts empty in production. Automation rules are server-owned
   * and fetched on demand. The legacy demo seed only runs in explicit
   * demo/dev mode. */
  const [automations, setAutomations] = useState<AutomationRule[]>(
    isDemoMode
      ? [
          { id: 'auto-1', name: 'Auto-move to Review', enabled: true, createdAt: new Date().toISOString(),
            trigger: { type: 'status_change', value: 'inprogress' },
            actions: [{ type: 'add_comment', value: 'Task moved to In Progress — review when ready.' }] },
          { id: 'auto-2', name: 'Escalate overdue tasks', enabled: true, createdAt: new Date().toISOString(),
            trigger: { type: 'due_date_approaching', daysBefore: 0 },
            actions: [{ type: 'set_priority', value: 'high' }] },
        ]
      : [],
  );

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

  /**
   * One-way sync: replace a project's local custom-column definitions with
   * API data. The server is the source of truth for `CustomField` records, so
   * on project load we replace any local-only columns (which would otherwise
   * lack a server-side `id` and would 404 when the user tries to set a value)
   * with the canonical server list. Each `CustomColumn` carries the
   * server-side `id` so `updateTask` can resolve the field by id when
   * persisting values.
   */
  const syncProjectCustomCols = useCallback((projectId: string, cols: CustomColumn[]) => {
    setCustomColsByProject(prev => ({ ...prev, [projectId]: cols }));
  }, []);

  const syncProjectComments = useCallback((projectId: string, comments: Comment[]) => {
    setCommentsByProject(prev => ({ ...prev, [projectId]: comments }));
  }, []);

  const syncProjectFiles = useCallback((projectId: string, files: FileItem[]) => {
    setFilesByProject(prev => ({ ...prev, [projectId]: files }));
  }, []);

  /** One-way sync: replace a project's local member id list with API data. */
  const syncProjectMembers = useCallback((projectId: string, memberUserIds: string[]) => {
    setProjects(prev => {
      const p = prev[projectId];
      if (!p) return prev;
      return { ...prev, [projectId]: { ...p, members: memberUserIds } };
    });
  }, []);

  /** One-way sync: replace a project's local status updates with API data. */
  const syncProjectStatusUpdates = useCallback((projectId: string, updates: ProjectStatusUpdate[]) => {
    setStatusUpdatesByProject(prev => ({ ...prev, [projectId]: updates }));
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

  const removeProjectFromCache = useCallback((projectId: string) => {
    setProjects((previous) => {
      const next = { ...previous };
      delete next[projectId];
      return next;
    });
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
    // Capture the task's pre-update customFields so we can roll back the
    // customFields portion of the optimistic update independently if the
    // value-set endpoint rejects a specific key.
    const customFieldsBefore = task?.customFields ? { ...task.customFields } : undefined;
    // Optimistic local update.
    commit(projectId, projectTasks.map(t => t.id === id ? { ...t, ...patch } : t));
    if (task && patch.status && patch.status !== task.status) {
      const actorName = resolveMemberName(userIdRef.current);
      logActivity(projectId, id, 'status_change', `${actorName} changed status to ${STATUS_META[patch.status]?.label || patch.status}`);
    }
    if (task && patch.priority && patch.priority !== task.priority) {
      const actorName = resolveMemberName(userIdRef.current);
      logActivity(projectId, id, 'priority_change', `${actorName} changed priority to ${PRIORITY_META[patch.priority]?.label || patch.priority}`);
    }
    if (task && patch.dueDate && patch.dueDate !== task.dueDate) {
      const actorName = resolveMemberName(userIdRef.current);
      logActivity(projectId, id, 'due_date_change', `${actorName} changed due date`);
    }
    // Persist to PostgreSQL. On failure, restore the snapshot (full project
    // task list at the moment before the optimistic update) so the UI doesn't
    // show a change the server rejected.
    //
    // The patch goes through `taskToApiPayload` so the frontend-only field
    // names (`assignee`, `start`) are translated to the API's
    // (`assigneeId`, `startDate`) and unsupported fields (`tags`,
    // `followers`, `customFields`, `storyPoints`) are dropped before they
    // reach the wire — those have dedicated endpoints.
    const apiPatch = taskToApiPayload(patch);
    if (Object.keys(apiPatch).length > 0) {
      apiUpdateTask(id, apiPatch).then((res) => {
        if (res.ok) return;
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to save task change', { description: res.error });
      });
    }

    // Persist custom-field value changes via the dedicated value-set
    // endpoint. `taskToApiPayload` strips `customFields`, so without this
    // branch the UI would appear to save a custom-field value but refresh
    // would lose it (item 4). We diff the new record against the task's
    // pre-update record so we only hit the network for keys that actually
    // changed; each key is upserted independently so a single failure rolls
    // back only that key.
    if (patch.customFields !== undefined) {
      const before = customFieldsBefore || {};
      const after = patch.customFields || {};
      const changedKeys = Object.keys(after).filter(k => after[k] !== before[k]);
      if (changedKeys.length > 0) {
        void Promise.allSettled(
          changedKeys.map((key) =>
            apiSetTaskCustomField(id, { key, value: after[key] ?? null }).then((res) => {
              if (res.ok) return;
              // Roll back just this key in the task's customFields record.
              setTasksByProject(prev => {
                const list = prev[projectId] || [];
                return {
                  ...prev,
                  [projectId]: list.map(t => {
                    if (t.id !== id) return t;
                    const restored = { ...(t.customFields || {}) };
                    if (before[key] === undefined) delete restored[key];
                    else restored[key] = before[key];
                    return { ...t, customFields: restored };
                  }),
                };
              });
              toast.error('Failed to save custom field', { description: `${key} — ${res.error}` });
            }),
          ),
        );
      }
    }
  }, [tasksByProject, commit, logActivity, resolveMemberName]);

  const toggleComplete = useCallback((projectId: string, id: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === id);
    if (!task) return;
    const actorName = resolveMemberName(userIdRef.current);
    // Snapshot for rollback.
    const snapshot = projectTasks;
    if (task.status === 'done') {
      // Reopen the task.
      const patch: Partial<Task> = { status: 'in_progress', progress: 0 };
      commit(projectId, projectTasks.map(t => t.id === id ? { ...t, ...patch } : t));
      logActivity(projectId, id, 'reopened', `${actorName} reopened this task`);
      toast.info('Task reopened', { description: task.name });
      apiUpdateTask(id, taskToApiPayload(patch)).then((res) => {
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
      logActivity(projectId, id, 'completed', `${actorName} marked as done`);
      toast.success('Task completed', { description: task.name });
      apiUpdateTask(id, taskToApiPayload(patch)).then((res) => {
        if (res.ok) return;
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to complete task', { description: res.error });
      });
    }
  }, [tasksByProject, commit, logActivity, resolveMemberName]);

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
    apiCreateTask(projectId, taskToApiPayload({
      name: input.name,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assignee: input.assignee,
      parentId: input.parentId,
      sectionId: input.sectionId,
      dueDate: input.dueDate,
      start: input.start,
      duration: input.duration,
    })).then((res) => {
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
    // Snapshot for rollback — restore the pre-delete task list (and the
    // selection set) if the server rejects the bulk delete.
    const snapshot = projectTasks;
    const snapshotSelection = new Set(selectedIds);
    // Optimistic local update.
    commit(projectId, projectTasks.filter(t => !ids.has(t.id)));
    setSelectedIds(new Set());
    toast.success(`${count} task${count > 1 ? 's' : ''} deleted`);
    // Persist to PostgreSQL via the bulk delete action. On failure, restore
    // the pre-delete task list + selection so the UI reflects the server's
    // canonical state.
    apiBulkAction(projectId, 'delete', [...ids]).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      setSelectedIds(snapshotSelection);
      toast.error('Failed to delete tasks on server', { description: res.error });
    });
  }, [tasksByProject, commit, selectedIds]);

  const bulkSetDueDate = useCallback((projectId: string, ids: Set<string>, date: string | null) => {
    if (!projectId || ids.size === 0) return;
    const projectTasks = tasksByProject[projectId] || [];
    // Snapshot for rollback.
    const snapshot = projectTasks;
    // Optimistic local update.
    updateTasksBulk(projectId, ids, { dueDate: date || undefined });
    toast.success(date ? `Due date set for ${ids.size} task${ids.size > 1 ? 's' : ''}` : `Due date cleared for ${ids.size} task${ids.size > 1 ? 's' : ''}`);
    // Persist to PostgreSQL via the bulk dueDate action. The schema expects
    // an ISO datetime or null; we normalise the YYYY-MM-DD form by appending
    // T00:00:00 so z.iso.datetime() accepts it.
    const dueDatePayload = date ? new Date(date).toISOString() : null;
    apiBulkAction(projectId, 'dueDate', [...ids], { dueDate: dueDatePayload }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to save due date', { description: res.error });
    });
  }, [tasksByProject, updateTasksBulk]);

  const bulkAddTag = useCallback((projectId: string, ids: Set<string>, tagId: string) => {
    if (!projectId || ids.size === 0) return;
    const projectTasks = tasksByProject[projectId] || [];
    // Snapshot for rollback.
    const snapshot = projectTasks;
    // Optimistic local update.
    updateTasksBulk(projectId, ids, (t) => {
      const current = t.tags || [];
      return { tags: current.includes(tagId) ? current : [...current, tagId] };
    });
    toast.success(`Tag added to ${ids.size} task${ids.size > 1 ? 's' : ''}`);
    // Persist to PostgreSQL via the bulk addTag action.
    apiBulkAction(projectId, 'addTag', [...ids], { tagId }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to add tag', { description: res.error });
    });
  }, [tasksByProject, updateTasksBulk]);

  const bulkRemoveTag = useCallback((projectId: string, ids: Set<string>, tagId: string) => {
    if (!projectId || ids.size === 0) return;
    const projectTasks = tasksByProject[projectId] || [];
    // Snapshot for rollback.
    const snapshot = projectTasks;
    // Optimistic local update.
    updateTasksBulk(projectId, ids, (t) => ({
      tags: (t.tags || []).filter(tid => tid !== tagId),
    }));
    toast.success(`Tag removed from ${ids.size} task${ids.size > 1 ? 's' : ''}`);
    // Persist to PostgreSQL via the bulk removeTag action.
    apiBulkAction(projectId, 'removeTag', [...ids], { tagId }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to remove tag', { description: res.error });
    });
  }, [tasksByProject, updateTasksBulk]);

  const bulkSetStatus = useCallback((projectId: string, ids: Set<string>, status: string) => {
    if (!projectId || ids.size === 0) return;
    const s = status as TaskStatus;
    const progress = s === 'done' ? 100 : s === 'backlog' ? 0 : undefined;
    const projectTasks = tasksByProject[projectId] || [];
    // Snapshot for rollback.
    const snapshot = projectTasks;
    // Optimistic local update.
    updateTasksBulk(projectId, ids, progress !== undefined ? { status: s, progress } : { status: s });
    toast.success(`${ids.size} task${ids.size > 1 ? 's' : ''} set to ${STATUS_META[s]?.label || s}`);
    apiBulkAction(projectId, 'status', [...ids], { status }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to save status change', { description: res.error });
    });
  }, [tasksByProject, updateTasksBulk]);

  const bulkAssign = useCallback((projectId: string, ids: Set<string>, memberId: string) => {
    if (!projectId || ids.size === 0) return;
    const projectTasks = tasksByProject[projectId] || [];
    // Snapshot for rollback.
    const snapshot = projectTasks;
    // Optimistic local update.
    updateTasksBulk(projectId, ids, { assignee: memberId });
    const memberName = resolveMemberName(memberId);
    toast.success(`Assigned ${ids.size} task${ids.size > 1 ? 's' : ''} to ${memberName}`);
    apiBulkAction(projectId, 'assignee', [...ids], { assigneeId: memberId }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to save assignment', { description: res.error });
    });
  }, [tasksByProject, updateTasksBulk, resolveMemberName]);

  const bulkSetPriority = useCallback((projectId: string, ids: Set<string>, priority: TaskPriority) => {
    if (!projectId || ids.size === 0) return;
    const projectTasks = tasksByProject[projectId] || [];
    // Snapshot for rollback.
    const snapshot = projectTasks;
    // Optimistic local update.
    updateTasksBulk(projectId, ids, { priority });
    toast.success(`Priority set to ${PRIORITY_META[priority].label} for ${ids.size} task${ids.size > 1 ? 's' : ''}`);
    apiBulkAction(projectId, 'priority', [...ids], { priority }).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to save priority change', { description: res.error });
    });
  }, [tasksByProject, updateTasksBulk]);

  const bulkComplete = useCallback((projectId: string, ids: Set<string>) => {
    if (!projectId || ids.size === 0) return;
    const projectTasks = tasksByProject[projectId] || [];
    // Snapshot for rollback.
    const snapshot = projectTasks;
    // Optimistic local update.
    updateTasksBulk(projectId, ids, { status: 'done', progress: 100 });
    toast.success(`Completed ${ids.size} task${ids.size > 1 ? 's' : ''}`);
    apiBulkAction(projectId, 'complete', [...ids]).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to save completion', { description: res.error });
    });
  }, [tasksByProject, updateTasksBulk]);

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
  /**
   * Set the recurrence pattern on every selected task. Persists each task
   * individually via `PATCH /api/tasks/:id` with `{ recurrence }` — the
   * bulk API doesn't have a recurrence action, so we fan out per-task.
   *
   * Snapshot + rollback: capture the pre-update task list, apply the
   * optimistic update, then issue the PATCHes in parallel. On any failure
   * we restore the snapshot so the UI matches the server's canonical state.
   */
  const setRecurrenceSelected = useCallback((projectId: string, freq: string | null) => {
    if (!projectId || selectedIds.size === 0) return;
    const projectTasks = tasksByProject[projectId] || [];
    const snapshot = projectTasks;
    // Optimistic local update.
    updateTasksBulk(projectId, selectedIds, { recurrence: freq });
    // Persist each task's recurrence via individual PATCHes. The recurrence
    // schema field accepts 'daily' | 'weekly' | 'monthly' | null.
    const ids = [...selectedIds];
    Promise.all(ids.map(id => apiUpdateTask(id, taskToApiPayload({ recurrence: freq })))).then(results => {
      const firstFailure = results.find(r => !r.ok);
      if (!firstFailure) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to save recurrence', { description: firstFailure.error });
    });
  }, [selectedIds, tasksByProject, updateTasksBulk]);
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
  /**
   * Paste the clipboard tasks into the current project.
   *
   * Phase 4 (item 3): each pasted task is now created via the API
   * (`POST /api/projects/:id/tasks`) instead of just being cloned locally.
   * We optimistically insert temp-id clones, then issue parallel POSTs and
   * reconcile each clone's id with the server's canonical id. On any
   * failure we remove the corresponding optimistic clone + surface a toast.
   */
  const paste = useCallback((projectId: string) => {
    if (!clipboard.items.length || !projectId) return;
    const projectTasks = tasksByProject[projectId] || [];
    // Snapshot for rollback — remove all pasted clones if the first
    // creation fails (subsequent failures are reported per-task but the
    // clones are left in place; the next project load reconciles).
    const snapshot = projectTasks;
    const clones = clipboard.items.map(t => ({
      ...t,
      id: defaultIdGenerator.generate('t'),
      projectId,
      name: t.name + ' (copy)',
      // Pasted tasks start fresh — no point carrying over the source's
      // completion state.
      status: 'backlog' as TaskStatus,
      progress: 0,
      deps: [],
      createdAt: new Date().toISOString(),
    }));
    // Optimistic local insert.
    commit(projectId, [...projectTasks, ...clones]);
    toast.success(`Pasted ${clones.length} task${clones.length > 1 ? 's' : ''}`);
    // Persist each clone via POST. Reconcile the temp id with the server id
    // on success; remove the clone on failure.
    Promise.all(clones.map(clone => apiCreateTask(projectId, taskToApiPayload({
      name: clone.name,
      description: clone.description,
      status: clone.status,
      priority: clone.priority,
      assignee: clone.assignee || undefined,
      parentId: clone.parentId,
      sectionId: clone.sectionId,
      dueDate: clone.dueDate,
      start: clone.start,
      duration: clone.duration,
    })).then(res => ({ cloneId: clone.id, res })))).then(results => {
      let anyFailure = false;
      for (const { cloneId, res } of results) {
        if (!res.ok) {
          anyFailure = true;
          // Remove the failed clone from the local list.
          setTasksByProject(prev => ({
            ...prev,
            [projectId]: (prev[projectId] || []).filter(t => t.id !== cloneId),
          }));
          continue;
        }
        const serverId = res.data?.task?.id;
        if (!serverId || serverId === cloneId) continue;
        // Swap the temp id for the canonical server id.
        setTasksByProject(prev => ({
          ...prev,
          [projectId]: (prev[projectId] || []).map(t => t.id === cloneId ? { ...t, id: serverId } : t),
        }));
      }
      if (anyFailure) {
        toast.error('Failed to paste some tasks on server');
        // If every paste failed, restore the snapshot.
        const allFailed = results.every(r => !r.res.ok);
        if (allFailed) setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      }
    });
  }, [clipboard.items, tasksByProject, commit]);

  /**
   * Import tasks from a CSV file.
   *
   * Phase 4 (item 3): each row is now created via the API
   * (`POST /api/projects/:id/tasks`) instead of just being added locally.
   * The CSV `assignee` column is matched against the store's `membersById`
   * map (real project members); unmatched rows are assigned to the current
   * user. Failed rows are skipped + reported via a single toast.
   */
  const importCSV = useCallback((projectId: string, file: File) => {
    if (!projectId) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as Record<string, string>[]).map(r => {
          // Resolve the CSV `assignee` column to a real project member id.
          // Match case-insensitively on the member's full name. Fall back
          // to the current user when no match (so the task isn't orphaned).
          const assigneeName = (r.assignee || '').toLowerCase();
          const member = assigneeName
            ? Object.values(membersRef.current).find(m => m.name.toLowerCase() === assigneeName)
            : undefined;
          const assigneeId = member?.id || userIdRef.current;
          return {
            id: defaultIdGenerator.generate('t'),
            projectId,
            name: r.name || 'Untitled task',
            description: r.description || undefined,
            assignee: assigneeId,
            start: r.start || TODAY.toISOString().slice(0, 10),
            duration: Number(r.duration) || 3,
            progress: Number(r.progress) || 0,
            priority: (PRIORITY_META[r.priority] ? r.priority : 'medium') as TaskPriority,
            status: (STATUS_META[r.status] ? r.status : 'backlog') as TaskStatus,
            deps: [],
          } as Task;
        });
        if (!rows.length) return;
        const projectTasks = tasksByProject[projectId] || [];
        const snapshot = projectTasks;
        // Optimistic local insert.
        commit(projectId, [...projectTasks, ...rows]);
        toast.success(`Importing ${rows.length} task${rows.length > 1 ? 's' : ''}…`);
        // Persist each row via POST. Reconcile the temp id with the server
        // id on success; remove the row on failure.
        Promise.all(rows.map(row => apiCreateTask(projectId, taskToApiPayload({
          name: row.name,
          description: row.description,
          status: row.status,
          priority: row.priority,
          assignee: row.assignee || undefined,
          dueDate: row.dueDate,
          start: row.start,
          duration: row.duration,
        })).then(res => ({ rowId: row.id, res })))).then(results => {
          let failed = 0;
          for (const { rowId, res } of results) {
            if (!res.ok) {
              failed++;
              setTasksByProject(prev => ({
                ...prev,
                [projectId]: (prev[projectId] || []).filter(t => t.id !== rowId),
              }));
              continue;
            }
            const serverId = res.data?.task?.id;
            if (!serverId || serverId === rowId) continue;
            setTasksByProject(prev => ({
              ...prev,
              [projectId]: (prev[projectId] || []).map(t => t.id === rowId ? { ...t, id: serverId } : t),
            }));
          }
          if (failed > 0) {
            toast.error(`Failed to import ${failed} task${failed > 1 ? 's' : ''} on server`);
            // If every row failed, restore the snapshot.
            if (failed === results.length) setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
          } else {
            toast.success(`Imported ${rows.length} task${rows.length > 1 ? 's' : ''}`);
          }
        });
      },
    });
  }, [tasksByProject, commit]);

  const exportCSV = useCallback((projectId: string) => {
    const project = projects[projectId];
    if (!project) return;
    const projectTasks = tasksByProject[projectId] || [];
    const csv = Papa.unparse(projectTasks.map(t => ({
      name: t.name,
      description: t.description || '',
      assignee: resolveMemberName(t.assignee),
      start: t.start,
      due_date: t.dueDate || '',
      duration: t.duration,
      progress: t.progress,
      priority: t.priority,
      status: t.status,
      tags: (t.tags || []).join(', '),
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${project.name.replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [tasksByProject, projects, resolveMemberName]);

  const attachFilesToSelected = useCallback(async (projectId: string, fileList: FileList) => {
    if (!selectedIds.size || !projectId) return;
    const targetId = [...selectedIds][0];
    try {
      const connectionResponse = await fetch('/api/storage/connections');
      const connectionData = await connectionResponse.json() as {
        connections?: { provider: 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' }[];
      };
      const provider = connectionData.connections?.[0]?.provider;
      if (!connectionResponse.ok || !provider) {
        toast.error('Connect a storage provider in Settings before attaching files');
        return;
      }
      const providerSlug = provider === 'GOOGLE_DRIVE' ? 'google-drive'
        : provider === 'ONEDRIVE' ? 'onedrive' : 'dropbox';
      const uploadedFiles: FileItem[] = [];
      for (const file of Array.from(fileList)) {
        const form = new FormData();
        form.set('provider', providerSlug);
        form.set('taskId', targetId);
        form.set('file', file);
        const response = await fetch('/api/projects/' + projectId + '/files/upload', {
          method: 'POST',
          body: form,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? 'Upload failed');
        if (data.file) {
          uploadedFiles.push({
            id: data.file.id,
            projectId: data.file.projectId,
            name: data.file.name,
            size: data.file.size,
            uploadedBy: data.file.uploadedById ?? '',
            uploadedAt: data.file.uploadedAt,
            linkedTaskId: data.file.taskId,
            url: '/api/files/' + data.file.id + '/download',
            thumbnailUrl: data.file.thumbnailUrl ?? undefined,
          });
        }
      }
      setFilesByProject((previous) => ({
        ...previous,
        [projectId]: [...uploadedFiles, ...(previous[projectId] ?? [])],
      }));
      toast.success('Files attached in connected storage');
    } catch (error) {
      toast.error('Failed to attach files', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [selectedIds]);

  const addColumn = useCallback((projectId: string, def: CustomColumn) => {
    if (!projectId) return;
    // Optimistic local insert. The server-side `CustomField.id` is reconciled
    // after the POST succeeds — without that id the value-set endpoint can
    // still resolve the field by (projectId, key), but having it lets us
    // DELETE the definition when the column is removed.
    setCustomColsByProject(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), def] }));
    apiCreateCustomField(projectId, {
      key: def.key,
      label: def.label,
      type: def.type,
      options: def.options,
    }).then((res) => {
      if (!res.ok) {
        toast.error('Failed to save custom field on server', { description: res.error });
        // Roll back the optimistic insert.
        setCustomColsByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(c => c.key !== def.key) }));
        return;
      }
      const serverFieldId = res.data?.field?.id;
      if (!serverFieldId) return;
      // Patch the locally-stored column with the canonical server id.
      setCustomColsByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(c => c.key === def.key ? { ...c, id: serverFieldId } : c),
      }));
    });
  }, []);

  const removeColumn = useCallback((projectId: string, key: string) => {
    if (!projectId) return;
    // Snapshot for rollback — restore the column if the server delete fails.
    const snapshot = customColsByProject[projectId] || [];
    const col = snapshot.find(c => c.key === key);
    setCustomColsByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(c => c.key !== key) }));
    if (!col) return;
    // If we never synced this column to the server (no server-side id), the
    // local removal above is the whole story — there's nothing to delete
    // server-side. (Cascade-clean of any TaskCustomFieldValue rows that may
    // have been created via the value-set endpoint will happen on the next
    // task-list refresh, since the value-set endpoint 404s when the field
    // definition is missing.)
    if (!col.id) return;
    apiDeleteCustomField(projectId, col.id).then((res) => {
      if (res.ok) return;
      setCustomColsByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to delete custom field on server', { description: res.error });
    });
  }, [customColsByProject]);

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
    // Optimistic insert with temp ID.
    const tempId = tag.id || defaultIdGenerator.generate('tag');
    const optimistic = { ...tag, id: tempId };
    const snapshot = tagsByProject[projectId] || [];
    setTagsByProject(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), optimistic] }));
    toast.success('Tag created', { description: tag.name });
    // Persist via POST /api/projects/:projectId/tags. Reconcile the temp ID
    // with the server ID on success; roll back on failure.
    apiCreateTag(projectId, { name: tag.name, color: tag.color }).then((res) => {
      if (!res.ok) {
        setTagsByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to create tag', { description: res.error });
        return;
      }
      const serverId = res.data?.tag?.id;
      if (!serverId || serverId === tempId) return;
      setTagsByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(t => t.id === tempId ? { ...t, id: serverId } : t),
      }));
    });
  }, [tagsByProject]);

  const removeTag = useCallback((projectId: string, tagId: string) => {
    if (!projectId) return;
    const tagList = tagsByProject[projectId] || [];
    const tag = tagList.find(t => t.id === tagId);
    // Snapshot for rollback.
    const snapshotTags = tagList;
    const snapshotTasks = tasksByProject[projectId] || [];
    // Optimistic local update.
    setTagsByProject(prev => ({ ...prev, [projectId]: tagList.filter(t => t.id !== tagId) }));
    const projectTasks = tasksByProject[projectId] || [];
    commit(projectId, projectTasks.map(t => ({ ...t, tags: (t.tags || []).filter(tid => tid !== tagId) })));
    toast.success('Tag removed', { description: tag?.name || 'Tag' });
    // Persist via DELETE /api/projects/:projectId/tags/:tagId. Roll back on failure.
    apiDeleteTag(projectId, tagId).then((res) => {
      if (res.ok) return;
      setTagsByProject(prev => ({ ...prev, [projectId]: snapshotTags }));
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshotTasks }));
      toast.error('Failed to delete tag', { description: res.error });
    });
  }, [tagsByProject, tasksByProject, commit]);

  const toggleTaskTag = useCallback((projectId: string, taskId: string, tagId: string) => {
    const projectTasks = tasksByProject[projectId] || [];
    const task = projectTasks.find(t => t.id === taskId);
    if (!task) return;
    // Snapshot for rollback — captured BEFORE the optimistic mutation.
    const snapshot = projectTasks;
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
    // Persist to PostgreSQL. Roll back the optimistic mutation on failure.
    if (isAdding) {
      apiAddTaskTag(taskId, tagId).then((res) => {
        if (res.ok) return;
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to add tag', { description: res.error });
      });
    } else {
      apiRemoveTaskTag(taskId, tagId).then((res) => {
        if (res.ok) return;
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to remove tag', { description: res.error });
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
    // Snapshot for rollback.
    const snapshot = projectTasks;
    // Optimistic local update — reassign sortOrder based on new positions.
    const reordered = arr.map((t, i) => ({ ...t, sortOrder: i }));
    commit(projectId, reordered);
    // Persist sortOrder changes via the project-scoped reorder endpoint so
    // the server stores the full, normalized ordering — not just the moved
    // task's new index (which would leave stale/duplicate sortOrder values
    // for the other tasks). Skip temp IDs (they haven't been POSTed yet).
    const payload = reordered.map(t => ({ id: t.id, sortOrder: t.sortOrder! }));
    const serverPayload = payload.filter(t => !t.id.startsWith('t_') && !t.id.startsWith('t-'));
    if (serverPayload.length === 0) return;
    apiReorderTasks(projectId, serverPayload).then((res) => {
      if (res.ok) return;
      // Roll back on failure.
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to save task order', { description: res.error });
    });
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
    apiCreateTask(projectId, taskToApiPayload({
      name: name.trim(),
      status: opts?.status as TaskStatus | undefined,
      parentId: opts?.parentId,
      start: opts?.startOverride,
    })).then((res) => {
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
    const actorName = resolveMemberName(userIdRef.current);
    logActivity(projectId, taskId, 'comment', `${actorName} ${parentId ? 'replied' : 'commented'}`);
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
  }, [commentsByProject, logActivity, resolveMemberName]);

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
    const memberName = resolveMemberName(userId);
    logActivity(projectId, taskId, 'comment', `${memberName} ${isFollowing ? 'stopped following' : 'is now following'} this task`);
    // Persist to PostgreSQL.
    const persist = isFollowing ? apiUnfollowTask(taskId) : apiFollowTask(taskId);
    persist.then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error(isFollowing ? 'Failed to unfollow task' : 'Failed to follow task', { description: res.error });
    });
  }, [tasksByProject, commit, logActivity, resolveMemberName]);

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
        resolveMemberName(t.assignee).toLowerCase().includes(q)
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
  }, [tasks, searchQuery, searchFilters, resolveMemberName]);

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
      const res = await apiCreateTask(projectId, taskToApiPayload({
        name: source.name + ' (copy)',
        description: source.description,
        status: 'backlog',
        priority: source.priority,
        assignee: source.assignee,
        parentId: serverParentId,
        sectionId: source.sectionId,
        dueDate: source.dueDate,
        start: source.start,
        duration: source.duration,
      }));
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

  /* Bulk duplicate selected tasks.
   *
   * Optimistically inserts local copies (one per selected task) with temp ids,
   * then creates each duplicate on the server in parallel via POST
   * /api/projects/:id/tasks. On success the temp id is swapped for the
   * canonical server id; on failure the corresponding temp copy is removed
   * and an error toast is shown for that specific copy. Each duplicate is
   * handled independently so a single server rejection never rolls back the
   * whole batch. After refresh the duplicates persist because they live in
   * PostgreSQL. Subtasks/comments/attachments are intentionally not copied
   * in bulk — callers wanting deep clones should use `duplicateTaskWithOptions`
   * per task. */
  const duplicateTasksBulk = useCallback((projectId: string, ids: Set<string>) => {
    const projectTasks = tasksByProject[projectId] || [];
    const newTasks: Task[] = [];
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
    if (!newTasks.length) return;
    // Snapshot for per-task rollback. We capture the full pre-duplicate task
    // list so a single failure can remove only its own temp copy without
    // touching the others.
    const snapshot = projectTasks;
    commit(projectId, [...projectTasks, ...newTasks]);
    toast.success(`${newTasks.length} task${newTasks.length > 1 ? 's' : ''} duplicated`);

    // Persist each duplicate independently. We do NOT use Promise.all — a
    // single rejection would short-circuit the chain. Promise.allSettled
    // ensures every copy gets a chance to succeed/fail on its own.
    void Promise.allSettled(
      newTasks.map((clone) =>
        apiCreateTask(projectId, taskToApiPayload({
          name: clone.name,
          description: clone.description,
          status: 'backlog',
          priority: clone.priority,
          assignee: clone.assignee,
          parentId: null,
          sectionId: clone.sectionId,
          dueDate: clone.dueDate,
          start: clone.start,
          duration: clone.duration,
        })).then((res) => {
          if (!res.ok) {
            // Roll back ONLY this temp copy. Restore everything else.
            setTasksByProject(prev => {
              const list = prev[projectId] || [];
              return { ...prev, [projectId]: list.filter(t => t.id !== clone.id) };
            });
            toast.error('Failed to duplicate task on server', { description: `${clone.name} — ${res.error}` });
            return null;
          }
          const serverId = res.data?.task?.id;
          if (!serverId || serverId === clone.id) return serverId ?? clone.id;
          // Swap temp id → canonical server id so subsequent edits hit the
          // right row.
          setTasksByProject(prev => {
            const list = prev[projectId] || [];
            return { ...prev, [projectId]: list.map(t => t.id === clone.id ? { ...t, id: serverId } : t) };
          });
          return serverId;
        }),
      ),
    ).then((results) => {
      // If every duplicate failed, restore the pre-duplicate snapshot so the
      // UI doesn't show ghost tasks. (When at least one succeeded we keep the
      // successful swaps; the per-task rollback above already removed the
      // failures.)
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
      const failed = results.length - succeeded;
      if (succeeded === 0 && failed > 0) {
        setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      }
    });
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
    const actorName = resolveMemberName(userIdRef.current);
    logActivity(projectId, taskId, 'created', `${actorName} promoted subtask to top-level`);
    toast.success('Subtask promoted', { description: task.name });
    // Persist to PostgreSQL — clearing parentId promotes the task.
    apiUpdateTask(taskId, taskToApiPayload({ parentId: null })).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to promote subtask', { description: res.error });
    });
  }, [tasksByProject, commit, logActivity, resolveMemberName]);

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
    const actorName = resolveMemberName(userIdRef.current);
    logActivity(projectId, taskId, 'created', `${actorName} converted task to subtask of "${parentTask?.name || 'task'}"`);
    toast.success('Converted to subtask', { description: task.name });
    // Persist to PostgreSQL — setting parentId demotes the task under the
    // new parent. The server enforces no-self-parent and no-circular
    // hierarchy, so on a 400 we roll back the optimistic change.
    apiUpdateTask(taskId, taskToApiPayload({ parentId: newParentId })).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to convert task to subtask', { description: res.error });
    });
  }, [tasksByProject, commit, logActivity]);

  /* ---- #34: Bulk set due date / add tag / set status ---- */
  /* ---- #35: Sections ---- */
  const addSection = useCallback((projectId: string, name: string) => {
    if (!projectId) return;
    const tempId = defaultIdGenerator.generate('sec');
    const currentSections = sectionsByProject[projectId] || [];
    const position = currentSections.length;
    const newSection: Section = { id: tempId, projectId, name, position, collapsed: false };
    // Snapshot for rollback — captures the pre-insert section list so we can
    // restore it if the API rejects the create.
    const snapshot = currentSections;
    // Optimistic local update.
    setSectionsByProject(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), newSection] }));
    toast.success('Section added', { description: name });
    // Persist to PostgreSQL. The API returns the canonical server section —
    // we swap the temp id for the server id so subsequent edits target the
    // right row. On failure we roll back the optimistic insert.
    apiCreateSection(projectId, name, position).then((res) => {
      if (!res.ok) {
        setSectionsByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to create section on server', { description: res.error });
        return;
      }
      const serverId = res.data?.section?.id;
      if (!serverId || serverId === tempId) return;
      setSectionsByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(s => s.id === tempId ? { ...s, id: serverId } : s),
      }));
      // Re-point any tasks that were optimistically assigned to the temp id.
      setTasksByProject(prev => {
        const list = prev[projectId] || [];
        const hasRef = list.some(t => t.sectionId === tempId);
        if (!hasRef) return prev;
        return { ...prev, [projectId]: list.map(t => t.sectionId === tempId ? { ...t, sectionId: serverId } : t) };
      });
    });
  }, [sectionsByProject]);

  const renameSection = useCallback((projectId: string, sectionId: string, name: string) => {
    if (!projectId) return;
    const snapshot = sectionsByProject[projectId] || [];
    // Optimistic local update.
    setSectionsByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(s => s.id === sectionId ? { ...s, name } : s),
    }));
    // Persist to PostgreSQL. Roll back on failure.
    apiUpdateSection(projectId, sectionId, { name }).then((res) => {
      if (res.ok) return;
      setSectionsByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to rename section', { description: res.error });
    });
  }, [sectionsByProject]);

  const deleteSection = useCallback((projectId: string, sectionId: string) => {
    if (!projectId) return;
    const projectTasks = tasksByProject[projectId] || [];
    const snapshotTasks = projectTasks;
    const snapshotSections = sectionsByProject[projectId] || [];
    // Optimistic local update — null out sectionId on tasks in this section,
    // then remove the section.
    commit(projectId, projectTasks.map(t => t.sectionId === sectionId ? { ...t, sectionId: null } : t));
    setSectionsByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(s => s.id !== sectionId),
    }));
    toast.success('Section removed');
    // Persist to PostgreSQL. Roll back (restore the section + restore the
    // sectionId on the previously-attached tasks) on failure.
    apiDeleteSection(projectId, sectionId).then((res) => {
      if (res.ok) return;
      setSectionsByProject(prev => ({ ...prev, [projectId]: snapshotSections }));
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshotTasks }));
      toast.error('Failed to delete section on server', { description: res.error });
    });
  }, [tasksByProject, sectionsByProject, commit]);

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
    const snapshot = sectionsByProject[projectId] || [];
    // Optimistic local update.
    setSectionsByProject(prev => ({ ...prev, [projectId]: renumbered }));
    // Persist the new position of the moved section. (Siblings keep their
    // server-side positions; only the moved section needs an update here.
    // The server's `updateSection` accepts a position int.)
    apiUpdateSection(projectId, sectionId, { position: toIndex }).then((res) => {
      if (res.ok) return;
      setSectionsByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to reorder section', { description: res.error });
    });
  }, [sectionsByProject]);

  const setTaskSection = useCallback((projectId: string, taskId: string, sectionId: string | null) => {
    const projectTasks = tasksByProject[projectId] || [];
    const snapshot = projectTasks;
    // Optimistic local update.
    commit(projectId, projectTasks.map(t => t.id === taskId ? { ...t, sectionId } : t));
    // Persist to PostgreSQL via the task PATCH endpoint (the sectionId field
    // on Task). Roll back on failure.
    apiUpdateTask(taskId, taskToApiPayload({ sectionId })).then((res) => {
      if (res.ok) return;
      setTasksByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to move task to section', { description: res.error });
    });
  }, [tasksByProject, commit]);

  /* Close menus on view change */
  useEffect(() => { setMoreMenuOpen(false); }, [activeView]);

  /* ====== Batch 7: Project Management Actions ====== */

  const updateProject = useCallback((projectId: string, patch: Partial<Project>) => {
    const prevProject = projects[projectId];
    if (!prevProject) return;
    // Snapshot for rollback — captures the pre-update project so we can
    // restore it if the API rejects the change.
    const snapshot = prevProject;
    // Optimistic local update.
    setProjects(prev => ({ ...prev, [projectId]: { ...prev[projectId], ...patch } }));
    // Translate the frontend Project shape to the API's update schema. The
    // frontend uses `start`/`end`; the API uses `startDate`/`endDate`.
    const apiPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) apiPatch.name = patch.name;
    if (patch.description !== undefined) apiPatch.description = patch.description ?? null;
    if (patch.color !== undefined) apiPatch.color = patch.color;
    if (patch.start !== undefined) apiPatch.startDate = patch.start || null;
    if (patch.end !== undefined) apiPatch.endDate = patch.end || null;
    apiUpdateProject(projectId, apiPatch).then((res) => {
      if (res.ok) return;
      setProjects(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to save project', { description: res.error });
    });
  }, [projects]);

  const toggleProjectFavorite = useCallback((projectId: string) => {
    const prevProject = projects[projectId];
    if (!prevProject) return;
    const snapshot = prevProject;
    // Optimistic local update.
    setProjects(prev => ({
      ...prev,
      [projectId]: { ...prev[projectId], isFavorite: !prev[projectId].isFavorite },
    }));
    // The server treats `{ favorite: boolean }` as a toggle trigger — any
    // boolean will do, and the server flips the per-user flag.
    apiSetProjectFavorite(projectId, !prevProject.isFavorite).then((res) => {
      if (res.ok) return;
      setProjects(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to toggle favorite', { description: res.error });
    });
  }, [projects]);

  const archiveProject = useCallback((projectId: string) => {
    const prevProject = projects[projectId];
    if (!prevProject) return;
    const snapshot = prevProject;
    // Optimistic local update.
    setProjects(prev => ({ ...prev, [projectId]: { ...prev[projectId], isArchived: true } }));
    if (currentProjectId === projectId) goToPortfolio();
    toast.success('Project archived');
    apiArchiveProject(projectId).then((res) => {
      if (res.ok) return;
      setProjects(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to archive project', { description: res.error });
    });
  }, [projects, currentProjectId, goToPortfolio]);

  const restoreProject = useCallback((projectId: string) => {
    const prevProject = projects[projectId];
    if (!prevProject) return;
    const snapshot = prevProject;
    // Optimistic local update.
    setProjects(prev => ({ ...prev, [projectId]: { ...prev[projectId], isArchived: false } }));
    toast.success('Project restored');
    apiRestoreProject(projectId).then((res) => {
      if (res.ok) return;
      setProjects(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to restore project', { description: res.error });
    });
  }, [projects]);

  const setProjectMembers = useCallback((projectId: string, members: string[]) => {
    const prevProject = projects[projectId];
    if (!prevProject) return;
    const prevMembers = prevProject.members || [];
    const snapshot = prevProject;
    // Optimistic local update — apply the full new member list immediately.
    setProjects(prev => ({ ...prev, [projectId]: { ...prev[projectId], members } }));

    // Diff against the previous list to figure out what to add/remove via
    // the API. We fire the requests in parallel; on any failure we roll
    // back the whole change so the UI matches the server's state.
    const added = members.filter(id => !prevMembers.includes(id));
    const removed = prevMembers.filter(id => !members.includes(id));
    if (added.length === 0 && removed.length === 0) return;

    const ops: Promise<{ ok: boolean; error?: string }>[] = [
      ...added.map(id => apiAddProjectMember(projectId, id)),
      ...removed.map(id => apiRemoveProjectMember(projectId, id)),
    ];
    Promise.all(ops).then((results) => {
      const failed = results.find(r => !r.ok);
      if (!failed) return;
      setProjects(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to update project members', { description: failed.error });
    });
  }, [projects]);

  const addProjectStatusUpdate = useCallback((projectId: string, text: string, color: 'green' | 'yellow' | 'red') => {
    if (!projectId) return;
    const tempId = defaultIdGenerator.generate('su');
    const update: ProjectStatusUpdate = {
      id: tempId, projectId: projectId, authorId: userIdRef.current,
      text, color, createdAt: new Date().toISOString(),
    };
    // Snapshot for rollback — captures the pre-insert status-update list.
    const snapshot = statusUpdatesByProject[projectId] || [];
    // Optimistic local update.
    setStatusUpdatesByProject(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), update],
    }));
    toast.success('Status update posted');
    // Persist to PostgreSQL. The API returns the canonical server update —
    // we swap the temp id for the server id so subsequent deletes target the
    // right row. On failure we roll back the optimistic insert.
    apiCreateProjectStatusUpdate(projectId, { text, color }).then((res) => {
      if (!res.ok) {
        setStatusUpdatesByProject(prev => ({ ...prev, [projectId]: snapshot }));
        toast.error('Failed to post status update', { description: res.error });
        return;
      }
      const serverId = res.data?.update?.id;
      if (!serverId || serverId === tempId) return;
      setStatusUpdatesByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(su => su.id === tempId ? { ...su, id: serverId } : su),
      }));
    });
  }, [statusUpdatesByProject]);

  const deleteProjectStatusUpdate = useCallback((projectId: string, id: string) => {
    if (!projectId) return;
    // Snapshot for rollback — captures the pre-delete list so we can restore
    // it if the API rejects the delete.
    const snapshot = statusUpdatesByProject[projectId] || [];
    // Optimistic local update.
    setStatusUpdatesByProject(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(su => su.id !== id),
    }));
    // Persist to PostgreSQL. Roll back on failure.
    apiDeleteProjectStatusUpdate(projectId, id).then((res) => {
      if (res.ok) return;
      setStatusUpdatesByProject(prev => ({ ...prev, [projectId]: snapshot }));
      toast.error('Failed to delete status update', { description: res.error });
    });
  }, [statusUpdatesByProject]);

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
    // Optimistic update
    const snapshot = approvals;
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: approved ? 'approved' as const : 'rejected' as const, resolvedAt: new Date().toISOString(), comment } : a));
    toast.success(approved ? 'Approved' : 'Rejected');
    // Persist via PATCH /api/approvals/:id
    fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, comment }),
    }).then(res => {
      if (res.ok) return;
      setApprovals(snapshot);
      toast.error('Failed to resolve approval');
    }).catch(() => {
      setApprovals(snapshot);
      toast.error('Failed to resolve approval');
    });
  }, [approvals]);
  const deleteApproval = useCallback((id: string) => {
    // Optimistic removal with snapshot for rollback
    const snapshot = approvals;
    setApprovals(prev => prev.filter(a => a.id !== id));
    toast.success('Approval deleted');
    fetch(`/api/approvals/${id}`, { method: 'DELETE' })
      .then(res => { if (res.ok) return; setApprovals(snapshot); toast.error('Failed to delete approval'); })
      .catch(() => { setApprovals(snapshot); toast.error('Failed to delete approval'); });
  }, [approvals]);

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
    currentUserName,
    setCurrentUserName,
    membersById,
    registerMembers,
    currentProjectId, activeView, selectedTaskId, selectedIds, searchQuery,
    showNewTask, showNewProject, projectMenuOpen, shareOpen, sidebarOpen, moreMenuOpen,
    durationUnit, clipboard, past, future,
    viewingFileId, setViewingFileId,
    project, tasks, files, raidItems, customCols, filteredTasks, selectedTask, viewingFile,
    tags, taskComments, taskActivity,
    searchFilters, setSearchFilters, activeFilterCount, clearFilters,
    timeLogs, taskTimeLogs,
    gridActions,
    openProject, syncProjectFromRoute, syncProjectTasks, syncProjectTags, syncProjectCustomCols, syncProjectComments, syncProjectFiles, syncProjectMembers, syncProjectStatusUpdates, syncProjects, upsertProject, removeProjectFromCache, goToPortfolio, createProject, createProjectFromTemplate, deleteProject,
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
