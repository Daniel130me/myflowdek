import { z } from 'zod';
import type { Project, Task, FileItem, RaidItem } from '@/features/flowdeck/model';

/**
 * FCP-5: this adapter no longer seeds business-data defaults from the mock
 * fixtures. The store starts empty in production and is populated on demand
 * from the API; localStorage only carries UI preferences. The mock data
 * arrays (`INITIAL_PROJECTS`, `initialTasks`, …) remain exported from
 * `model/data.ts` for the explicit demo/dev mode, but they are NOT used as
 * fallback defaults here.
 */

export const STORAGE_KEY = 'flowdeck-state-v1';
export const TEMPLATES_STORAGE_KEY = 'flowdeck-custom-templates-v1';
export const STORAGE_VERSION = 2;

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().default('#FE8029'),
  start: z.string().default('2026-07-01'),
  end: z.string().default('2026-12-31'),
  description: z.string().optional(),
  members: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const TaskStatusSchema = z.enum(['backlog', 'in_progress', 'review', 'done']);
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const TaskSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema.default('backlog'),
  assignee: z.string().default('u1'),
  start: z.string().default('2026-07-01'),
  duration: z.number().int().nonnegative().default(1),
  dueDate: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
  priority: TaskPrioritySchema.default('medium'),
  deps: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional(),
  followers: z.array(z.string()).optional(),
  parentId: z.string().nullable().optional(),
  level: z.number().optional(),
  bold: z.boolean().optional(),
  color: z.string().nullable().optional(),
  milestone: z.boolean().optional(),
  recurrence: z.string().nullable().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  storyPoints: z.number().optional(),
  createdAt: z.string().optional(),
  sectionId: z.string().nullable().optional(),
});

export const FileSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().optional(),
  name: z.string().min(1),
  size: z.number().default(0),
  uploadedBy: z.string().default('u1'),
  uploadedAt: z.string().default('2026-07-01'),
  linkedTaskId: z.string().nullable().optional(),
  url: z.string().optional(),
  thumbnailUrl: z.string().optional(),
});

export const TagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().default('#FE8029'),
});

export const CommentSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  authorId: z.string().default('u1'),
  text: z.string().default(''),
  createdAt: z.string().default('2026-07-01T00:00:00'),
  reactions: z.array(z.object({
    emoji: z.string(),
    userIds: z.array(z.string()),
  })).optional(),
  edited: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
});

export const ActivityEntrySchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  type: z.string(),
  description: z.string(),
  authorId: z.string(),
  timestamp: z.string(),
});

export const TimeLogSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  userId: z.string().default('u1'),
  minutes: z.number().default(0),
  note: z.string().default(''),
  loggedAt: z.string().default('2026-07-01T00:00:00'),
});

export const SectionSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string(),
  position: z.number().default(0),
  collapsed: z.boolean().optional(),
});

export const CustomColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'select']),
  options: z.array(z.string()).optional(),
});

export const PersistedStateSchema = z.object({
  version: z.number().optional().default(STORAGE_VERSION),
  projects: z.record(z.string(), ProjectSchema).optional(),
  tasksByProject: z.record(z.string(), z.array(TaskSchema)).optional(),
  filesByProject: z.record(z.string(), z.array(FileSchema)).optional(),
  raidByProject: z.record(z.string(), z.array(z.any())).optional(),
  customColsByProject: z.record(z.string(), z.array(CustomColumnSchema)).optional(),
  tagsByProject: z.record(z.string(), z.array(TagSchema)).optional(),
  commentsByProject: z.record(z.string(), z.array(CommentSchema)).optional(),
  activityByProject: z.record(z.string(), z.array(ActivityEntrySchema)).optional(),
  timeLogsByProject: z.record(z.string(), z.array(TimeLogSchema)).optional(),
  sectionsByProject: z.record(z.string(), z.array(SectionSchema)).optional(),
  statusUpdatesByProject: z.record(z.string(), z.array(z.any())).optional(),
  savedFilters: z.array(z.any()).optional(),
  activeView: z.string().optional(),
  tasks: z.array(z.any()).optional(),
  files: z.array(z.any()).optional(),
  raidItems: z.array(z.any()).optional(),
  goals: z.array(z.any()).optional(),
  keyResults: z.array(z.any()).optional(),
  automations: z.array(z.any()).optional(),
  forms: z.array(z.any()).optional(),
  approvals: z.array(z.any()).optional(),
  budgets: z.array(z.any()).optional(),
  expenses: z.array(z.any()).optional(),
  timesheets: z.array(z.any()).optional(),
  submissions: z.array(z.any()).optional(),
  tags: z.array(z.any()).optional(),
  customCols: z.array(z.any()).optional(),
  timeLogs: z.array(z.any()).optional(),
  currentProjectId: z.string().nullable().optional(),
  userProfile: z.any().optional(),
});

export type PersistedState = z.infer<typeof PersistedStateSchema>;

export function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return migrateState(parsed);
  } catch (err) {
    console.warn('[Flowdek] Failed to load persisted state from localStorage:', err);
    return null;
  }
}

export function savePersistedState(state: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  try {
    const dataToSave = {
      ...state,
      version: STORAGE_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (err) {
    console.warn('[Flowdek] Failed to save state to localStorage:', err);
  }
}

export function clearPersistedState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[Flowdek] Failed to clear persisted state from localStorage:', err);
  }
}

export function loadCustomTemplates(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplates(templates: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.warn('[Flowdek] Failed to save custom templates to localStorage:', err);
  }
}

export function clearCustomTemplates(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TEMPLATES_STORAGE_KEY);
  } catch (err) {
    console.warn('[Flowdek] Failed to clear custom templates from localStorage:', err);
  }
}

export function migrateState(rawState: unknown): PersistedState {
  if (typeof rawState !== 'object' || rawState === null) {
    return createDefaultPersistedState();
  }

  // Handle legacy status 'inprogress' normalization if present in rawState
  const sanitized = JSON.parse(JSON.stringify(rawState), (key, value) => {
    if (key === 'status' && value === 'inprogress') return 'in_progress';
    return value;
  });

  if (sanitized.tasksByProject && typeof sanitized.tasksByProject === 'object') {
    const migratedTasksByProject: Record<string, any[]> = {};
    for (const [projectId, tasks] of Object.entries(sanitized.tasksByProject as Record<string, any>)) {
      if (Array.isArray(tasks)) {
        migratedTasksByProject[projectId] = tasks.map((task: any) => ({
          ...task,
          projectId: projectId, // Enforce collection key as projectId
        }));
      }
    }
    sanitized.tasksByProject = migratedTasksByProject;
  }

  const result = PersistedStateSchema.safeParse(sanitized);
  if (!result.success) {
    console.warn('[Flowdek] Persisted state validation failed, falling back to safe state:', result.error);
    return createDefaultPersistedState();
  }

  const validated = result.data;

  return {
    version: STORAGE_VERSION,
    // FCP-5: business-data fields are passed through as-is when present in
    // localStorage, but we no longer fall back to the mock fixtures when
    // they're missing. The store ignores these fields anyway (it only
    // hydrates `currentProjectId` and `activeView` from localStorage); they
    // remain in the schema for backward compatibility with older writes.
    projects: (validated.projects ?? {}) as Record<string, Project>,
    tasksByProject: (validated.tasksByProject ?? {}) as Record<string, Task[]>,
    filesByProject: (validated.filesByProject ?? {}) as Record<string, FileItem[]>,
    raidByProject: (validated.raidByProject ?? {}) as Record<string, RaidItem[]>,
    customColsByProject: validated.customColsByProject ?? {},
    tagsByProject: validated.tagsByProject ?? {},
    commentsByProject: validated.commentsByProject ?? {},
    activityByProject: validated.activityByProject ?? {},
    timeLogsByProject: validated.timeLogsByProject ?? {},
    sectionsByProject: validated.sectionsByProject ?? {},
    statusUpdatesByProject: validated.statusUpdatesByProject ?? {},
    savedFilters: validated.savedFilters ?? [],
    activeView: validated.activeView,
    tasks: (Array.isArray(validated.tasks) ? validated.tasks : Object.values(validated.tasksByProject ?? {}).flat()) as Task[],
    files: (Array.isArray(validated.files) ? validated.files : Object.values(validated.filesByProject ?? {}).flat()) as FileItem[],
    raidItems: (Array.isArray(validated.raidItems) ? validated.raidItems : Object.values(validated.raidByProject ?? {}).flat()) as RaidItem[],
    goals: Array.isArray(validated.goals) ? validated.goals : [],
    keyResults: Array.isArray(validated.keyResults) ? validated.keyResults : [],
    automations: Array.isArray(validated.automations) ? validated.automations : [],
    forms: Array.isArray(validated.forms) ? validated.forms : [],
    approvals: Array.isArray(validated.approvals) ? validated.approvals : [],
    budgets: Array.isArray(validated.budgets) ? validated.budgets : [],
    expenses: Array.isArray(validated.expenses) ? validated.expenses : [],
    timesheets: Array.isArray(validated.timesheets) ? validated.timesheets : [],
    submissions: Array.isArray(validated.submissions) ? validated.submissions : [],
    tags: Array.isArray(validated.tags) ? validated.tags : [],
    customCols: Array.isArray(validated.customCols) ? validated.customCols : [],
    timeLogs: Array.isArray(validated.timeLogs) ? validated.timeLogs : [],
    currentProjectId: validated.currentProjectId ?? null,
    userProfile: validated.userProfile ?? null,
  };
}

export function createDefaultPersistedState(): PersistedState {
  // FCP-5: defaults are empty — the store does NOT seed business data from
  // localStorage. Only UI preferences (`currentProjectId`, `activeView`)
  // survive a missing/corrupted localStorage entry; everything else is
  // fetched from the API.
  return {
    version: STORAGE_VERSION,
    projects: {},
    tasksByProject: {},
    filesByProject: {},
    raidByProject: {},
    customColsByProject: {},
    tagsByProject: {},
    commentsByProject: {},
    activityByProject: {},
    timeLogsByProject: {},
    sectionsByProject: {},
    statusUpdatesByProject: {},
    savedFilters: [],
    activeView: undefined,
    tasks: [],
    files: [],
    raidItems: [],
    goals: [],
    keyResults: [],
    automations: [],
    forms: [],
    approvals: [],
    budgets: [],
    expenses: [],
    timesheets: [],
    submissions: [],
    tags: [],
    customCols: [],
    timeLogs: [],
    currentProjectId: null,
    userProfile: null,
  };
}
