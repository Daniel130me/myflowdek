import type { Task, TaskStatus, TaskPriority } from '@/features/flowdeck/model';

export interface CreateTaskInput {
  name: string;
  projectId: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  start?: string;
  dueDate?: string;
  duration?: number;
  progress?: number;
  tags?: string[];
  parentId?: string | null;
  sectionId?: string | null;
  recurrence?: string | null;
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  assignee?: string;
  start?: string;
  dueDate?: string;
  duration?: number;
  progress?: number;
  tags?: string[];
  deps?: string[];
  followers?: string[];
  parentId?: string | null;
  level?: number;
  bold?: boolean;
  color?: string | null;
  milestone?: boolean;
  recurrence?: string | null;
  customFields?: Record<string, string>;
  storyPoints?: number;
  sectionId?: string | null;
}

export interface TaskListOptions {
  status?: TaskStatus;
  assigneeId?: string;
  searchQuery?: string;
}

export interface TaskRepository {
  listByProject(projectId: string, options?: TaskListOptions): Promise<Task[]>;
  getById(projectId: string, taskId: string): Promise<Task | null>;
  create(projectId: string, input: CreateTaskInput): Promise<Task>;
  update(taskId: string, input: UpdateTaskInput): Promise<Task>;
  remove(taskId: string): Promise<void>;
}
