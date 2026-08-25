/* ---------------------------------- Team ---------------------------------- */
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
}

/**
 * Lightweight member identity used by the global MemberDirectory — the
 * minimum needed to render an avatar + display name. Sourced from real
 * `GET /api/projects/:id/members` responses (the `user` projection on
 * ProjectMember).
 */
export interface MemberInfo {
  id: string;
  name: string;
  /** Optional role / job title (display-only). */
  role?: string;
  /** Optional avatar colour (hex). */
  color?: string;
}

/* ---------------------------------- Project ---------------------------------- */
export interface Project {
  id: string;
  name: string;
  color: string;
  start: string;
  end: string;
  /* #36 */ description?: string;
  /* #37 */ members?: string[];
  /* #38 */ isFavorite?: boolean;
  /* #39 */ isArchived?: boolean;
  /** Server-derived portfolio rollup. Never calculate this from partial browser caches. */
  portfolio?: {
    taskCount: number;
    completedTaskCount: number;
    averageProgress: number;
    overdueTaskCount: number;
    memberCount: number;
  };
}

/* ---------------------------------- Tag ---------------------------------- */
export interface Tag {
  id: string;
  name: string;
  color: string;
}

/* ---------------------------------- Reaction ---------------------------------- */
export interface Reaction {
  emoji: string;
  userIds: string[];
}

/* ---------------------------------- Comment ---------------------------------- */
export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: string;
  /* #43 */ reactions?: Reaction[];
  /* #44 */ edited?: boolean;
  /* #45 */ parentId?: string | null;
}

/* ---------------------------------- Activity ---------------------------------- */
export interface ActivityEntry {
  id: string;
  taskId: string;
  type: 'status_change' | 'assignee_change' | 'comment' | 'created' | 'completed' | 'reopened' | 'priority_change' | 'due_date_change' | 'tag_added' | 'tag_removed' | 'progress_change';
  description: string;
  authorId: string;
  timestamp: string;
}

/* ---------------------------------- Search ---------------------------------- */
export interface SearchFilters {
  assignees: string[];
  statuses: string[];
  priorities: string[];
  tags: string[];
  dueBefore: string | null;
  dueAfter: string | null;
}

export const EMPTY_FILTERS: SearchFilters = {
  assignees: [], statuses: [], priorities: [], tags: [],
  dueBefore: null, dueAfter: null,
};

/* ---------------------------------- Task ---------------------------------- */
export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: TaskStatus;
  assignee: string;
  start: string;
  duration: number;
  dueDate?: string;
  progress: number;
  priority: TaskPriority;
  deps: string[];
  tags?: string[];
  followers?: string[];
  parentId?: string | null;
  level?: number;
  bold?: boolean;
  color?: string | null;
  milestone?: boolean;
  recurrence?: string | null;
  customFields?: Record<string, string>;
  storyPoints?: number;
  createdAt?: string;
  sectionId?: string | null;
  /** Backend-managed ordering column. Mirrors `Task.sortOrder` in the
   *  Prisma schema; surfaced to the client so the task list can be
   *  re-sorted without an extra fetch after a reorder. */
  sortOrder?: number;
}

export interface CreateTaskInput {
  name: string;
  description?: string;
  status?: TaskStatus;
  assignee?: string;
  start?: string;
  duration?: number;
  dueDate?: string;
  priority?: TaskPriority;
  deps?: string[];
  tags?: string[];
  parentId?: string | null;
  sectionId?: string | null;
  customFields?: Record<string, string>;
  storyPoints?: number;
  color?: string | null;
  milestone?: boolean;
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  start?: string;
  duration?: number;
  dueDate?: string | null;
  progress?: number;
  tags?: string[];
  deps?: string[];
  followers?: string[];
  parentId?: string | null;
  sectionId?: string | null;
  customFields?: Record<string, string>;
  storyPoints?: number;
  sortOrder?: number;
}

/* ---------------------------------- Files ---------------------------------- */
export interface FileItem {
  id: string;
  projectId?: string;
  name: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  linkedTaskId: string | null;
  url?: string;
  thumbnailUrl?: string;
  /** Connected storage provider (GOOGLE_DRIVE, ONEDRIVE, DROPBOX) or null
   *  for legacy R2/local files. When set, the file is provider-hosted and
   *  must be opened via `providerWebUrl`, NOT via `/api/files/:id/download`. */
  storageProvider?: 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | null;
  /** Direct URL to the file on the provider's side (e.g. Google Drive
   *  webViewLink). Used to open the file in the provider's native UI. */
  providerWebUrl?: string | null;
  /** MIME type of the file (e.g. application/vnd.google-apps.document). */
  mimeType?: string | null;
}

/* ---------------------------------- RAID ---------------------------------- */
export interface RaidItem {
  id: string;
  type: string;
  description: string;
  owner: string;
  impact: string;
  status: string;
  dateRaised: string;
}

/* ---------------------------------- Project Template ---------------------------------- */
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  taskCount: number;
  tags: { name: string; color: string }[];
  customCols: CustomColumn[];
  generateTasks: (projectId: string, start: string) => Task[];
}

/* ---------------------------------- Time Log ---------------------------------- */
export interface TimeLog {
  id: string;
  taskId: string;
  userId: string;
  minutes: number;
  note: string;
  loggedAt: string;
}

/* ---------------------------------- Custom Column ---------------------------------- */
export interface CustomColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[]; // for select type
  /**
   * Server-side `CustomField.id`. Populated when the column has been synced
   * to the backend (POST /api/projects/:id/custom-fields). May be undefined
   * for locally-created columns that haven't been persisted yet, or for
   * columns loaded from a project template before the template's fields are
   * created on the server. The store reconciles this id once the server
   * responds.
   */
  id?: string;
}

/* ---------------------------------- Section ---------------------------------- */
export interface Section {
  id: string;
  projectId: string;
  name: string;
  position: number;
  collapsed?: boolean;
}

/* ---------------------------------- Project Status Update ---------------------------------- */
export interface ProjectStatusUpdate {
  id: string;
  projectId: string;
  authorId: string;
  text: string;
  color: 'green' | 'yellow' | 'red';
  createdAt: string;
}

/* ---------------------------------- Goal / OKR ---------------------------------- */
export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: 'on_track' | 'at_risk' | 'off_track' | 'not_started';
  startDate: string;
  endDate: string;
  parentId?: string | null;
  linkedProjectIds?: string[];
}

export interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}

/* ---------------------------------- Saved Filter ---------------------------------- */
export interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
  isPinned?: boolean;
}

/* ---------------------------------- Notification ---------------------------------- */
export interface NotificationItem {
  id: string;
  type: 'comment' | 'assignment' | 'due_date' | 'status_change' | 'completed' | 'mentioned';
  taskId: string;
  projectId: string;
  message: string;
 actorId: string;
  read: boolean;
  createdAt: string;
}

/* ---------------------------------- Automation Rule ---------------------------------- */
export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  createdAt: string;
}

export interface AutomationTrigger {
  type: 'status_change' | 'assignee_change' | 'priority_change' | 'due_date_approaching' | 'task_created' | 'task_completed';
  field?: string;
  value?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  daysBefore?: number;
}

export interface AutomationAction {
  type: 'set_status' | 'set_priority' | 'set_assignee' | 'add_tag' | 'remove_tag' | 'add_comment' | 'set_due_date' | 'notify';
  value?: string;
  field?: string;
}

/* ---------------------------------- Form / Request Intake ---------------------------------- */
export interface Form {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  fields: FormField[];
  createdAt: string;
  isActive: boolean;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'email';
  required: boolean;
  options?: string[];
}

export interface FormSubmission {
  id: string;
  formId: string;
  projectId: string;
  data: Record<string, string>;
  submittedAt: string;
  submittedBy?: string;
  convertedTaskId?: string;
}

/* ---------------------------------- Approval ---------------------------------- */
export interface ApprovalRequest {
  id: string;
  taskId: string;
  projectId: string;
  requesterId: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  resolvedAt?: string;
  comment?: string;
}

/* ---------------------------------- Budget & Expense ---------------------------------- */
export interface Budget {
  id: string;
  projectId: string;
  name: string;
  totalBudget: number;
  spent: number;
  currency: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  budgetId: string;
  projectId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

/* ---------------------------------- Timesheet ---------------------------------- */
export interface TimesheetEntry {
  id: string;
  userId: string;
  projectId: string;
  taskId: string;
  date: string;
  hours: number;
  note: string;
  submitted: boolean;
  approved: boolean;
  createdAt: string;
}
