import { INITIAL_PROJECTS, initialTasks, initialFiles, initialRaid } from '@/features/flowdeck/model/data';

export const STORAGE_KEY = 'flowdeck-state-v1';
export const STORAGE_VERSION = 1;

export interface PersistedState {
  version?: number;
  projects?: Record<string, any>;
  tasksByProject?: Record<string, any[]>;
  filesByProject?: Record<string, any[]>;
  raidByProject?: Record<string, any[]>;
  customColsByProject?: Record<string, any[]>;
  tagsByProject?: Record<string, any[]>;
  commentsByProject?: Record<string, any[]>;
  activityByProject?: Record<string, any[]>;
  tasks?: any[];
  files?: any[];
  raidItems?: any[];
  goals?: any[];
  keyResults?: any[];
  automations?: any[];
  forms?: any[];
  approvals?: any[];
  budgets?: any[];
  expenses?: any[];
  timesheets?: any[];
  submissions?: any[];
  tags?: any[];
  customCols?: any[];
  timeLogs?: any[];
  currentProjectId?: string;
  userProfile?: any;
}

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

export function migrateState(rawState: any): PersistedState {
  // Ensure valid object structure and add default fallback arrays/records if fields are missing
  const migrated: PersistedState = {
    version: rawState.version || STORAGE_VERSION,
    projects: rawState.projects && typeof rawState.projects === 'object' ? rawState.projects : INITIAL_PROJECTS,
    tasksByProject: rawState.tasksByProject && typeof rawState.tasksByProject === 'object' ? rawState.tasksByProject : initialTasks,
    filesByProject: rawState.filesByProject && typeof rawState.filesByProject === 'object' ? rawState.filesByProject : initialFiles,
    raidByProject: rawState.raidByProject && typeof rawState.raidByProject === 'object' ? rawState.raidByProject : initialRaid,
    tasks: Array.isArray(rawState.tasks) ? rawState.tasks : Object.values(rawState.tasksByProject || initialTasks).flat(),
    files: Array.isArray(rawState.files) ? rawState.files : Object.values(rawState.filesByProject || initialFiles).flat(),
    raidItems: Array.isArray(rawState.raidItems) ? rawState.raidItems : Object.values(rawState.raidByProject || initialRaid).flat(),
    goals: Array.isArray(rawState.goals) ? rawState.goals : [],
    keyResults: Array.isArray(rawState.keyResults) ? rawState.keyResults : [],
    automations: Array.isArray(rawState.automations) ? rawState.automations : [],
    forms: Array.isArray(rawState.forms) ? rawState.forms : [],
    approvals: Array.isArray(rawState.approvals) ? rawState.approvals : [],
    budgets: Array.isArray(rawState.budgets) ? rawState.budgets : [],
    expenses: Array.isArray(rawState.expenses) ? rawState.expenses : [],
    timesheets: Array.isArray(rawState.timesheets) ? rawState.timesheets : [],
    submissions: Array.isArray(rawState.submissions) ? rawState.submissions : [],
    tags: Array.isArray(rawState.tags) ? rawState.tags : [],
    customCols: Array.isArray(rawState.customCols) ? rawState.customCols : [],
    timeLogs: Array.isArray(rawState.timeLogs) ? rawState.timeLogs : [],
    currentProjectId: rawState.currentProjectId || 'p1',
    userProfile: rawState.userProfile || null,
  };

  return migrated;
}
