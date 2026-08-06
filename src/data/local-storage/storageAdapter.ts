import { z } from 'zod';
import { INITIAL_PROJECTS, initialTasks, initialFiles, initialRaid } from '@/features/flowdeck/model/data';

export const STORAGE_KEY = 'flowdeck-state-v1';
export const STORAGE_VERSION = 1;

export const PersistedStateSchema = z.object({
  version: z.number().optional().default(STORAGE_VERSION),
  projects: z.record(z.string(), z.any()).optional(),
  tasksByProject: z.record(z.string(), z.array(z.any())).optional(),
  filesByProject: z.record(z.string(), z.array(z.any())).optional(),
  raidByProject: z.record(z.string(), z.array(z.any())).optional(),
  customColsByProject: z.record(z.string(), z.array(z.any())).optional(),
  tagsByProject: z.record(z.string(), z.array(z.any())).optional(),
  commentsByProject: z.record(z.string(), z.array(z.any())).optional(),
  activityByProject: z.record(z.string(), z.array(z.any())).optional(),
  timeLogsByProject: z.record(z.string(), z.array(z.any())).optional(),
  sectionsByProject: z.record(z.string(), z.array(z.any())).optional(),
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

export function savePersistedState(state: Partial<PersistedState>): void {
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

export function migrateState(rawState: unknown): PersistedState {
  if (typeof rawState !== 'object' || rawState === null) {
    return createDefaultPersistedState();
  }

  const result = PersistedStateSchema.safeParse(rawState);
  if (!result.success) {
    console.warn('[Flowdek] Persisted state validation failed, falling back to safe state:', result.error);
    return createDefaultPersistedState();
  }

  const validated = result.data;

  return {
    version: validated.version ?? STORAGE_VERSION,
    projects: validated.projects && Object.keys(validated.projects).length > 0 ? validated.projects : INITIAL_PROJECTS,
    tasksByProject: validated.tasksByProject ?? initialTasks,
    filesByProject: validated.filesByProject ?? initialFiles,
    raidByProject: validated.raidByProject ?? initialRaid,
    tasks: Array.isArray(validated.tasks) ? validated.tasks : Object.values(validated.tasksByProject || initialTasks).flat(),
    files: Array.isArray(validated.files) ? validated.files : Object.values(validated.filesByProject || initialFiles).flat(),
    raidItems: Array.isArray(validated.raidItems) ? validated.raidItems : Object.values(validated.raidByProject || initialRaid).flat(),
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
  return {
    version: STORAGE_VERSION,
    projects: INITIAL_PROJECTS,
    tasksByProject: initialTasks,
    filesByProject: initialFiles,
    raidByProject: initialRaid,
    tasks: Object.values(initialTasks).flat(),
    files: Object.values(initialFiles).flat(),
    raidItems: Object.values(initialRaid).flat(),
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
