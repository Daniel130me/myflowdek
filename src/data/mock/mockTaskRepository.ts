import type { TaskRepository, CreateTaskInput, UpdateTaskInput, TaskListOptions } from '../contracts/taskRepository';
import type { Task } from '@/features/flowdeck/model';
import { initialTasks } from '@/features/flowdeck/model/data';
import { loadPersistedState, savePersistedState } from '../local-storage/storageAdapter';
import { defaultIdGenerator } from '@/shared/utils/id';

export class MockTaskRepository implements TaskRepository {
  private tasksByProject: Record<string, Task[]>;

  constructor() {
    const persisted = loadPersistedState();
    if (persisted && persisted.tasksByProject) {
      this.tasksByProject = persisted.tasksByProject as Record<string, Task[]>;
    } else {
      this.tasksByProject = initialTasks;
    }
  }

  private persist() {
    savePersistedState({ tasksByProject: this.tasksByProject });
  }

  async listByProject(projectId: string, options?: TaskListOptions): Promise<Task[]> {
    const list = this.tasksByProject[projectId] || [];
    if (!options) return list;

    return list.filter(t => {
      if (options.status && t.status !== options.status) return false;
      if (options.assigneeId && t.assignee !== options.assigneeId) return false;
      if (options.searchQuery && !t.name.toLowerCase().includes(options.searchQuery.toLowerCase())) return false;
      return true;
    });
  }

  async getById(projectId: string, taskId: string): Promise<Task | null> {
    const list = this.tasksByProject[projectId] || [];
    return list.find(t => t.id === taskId) || null;
  }

  async create(projectId: string, input: CreateTaskInput): Promise<Task> {
    const newTask: Task = {
      id: defaultIdGenerator.generate('t'),
      projectId,
      name: input.name,
      description: input.description || '',
      status: input.status || 'backlog',
      assignee: input.assigneeId || 'u1',
      start: input.start || new Date().toISOString().slice(0, 10),
      duration: input.duration || 3,
      dueDate: input.dueDate,
      progress: input.progress || 0,
      priority: input.priority || 'medium',
      deps: [],
      tags: input.tags || [],
      parentId: input.parentId || null,
      sectionId: input.sectionId || null,
      recurrence: input.recurrence || null,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    if (!this.tasksByProject[projectId]) {
      this.tasksByProject[projectId] = [];
    }
    this.tasksByProject[projectId].push(newTask);
    this.persist();
    return newTask;
  }

  async update(taskId: string, input: UpdateTaskInput): Promise<Task> {
    let foundTask: Task | null = null;
    let foundProjectId: string | null = null;

    for (const [pid, list] of Object.entries(this.tasksByProject)) {
      const idx = list.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        const updated: Task = {
          ...list[idx],
          ...input,
          assignee: input.assigneeId !== undefined ? (input.assigneeId || 'u1') : input.assignee !== undefined ? input.assignee : list[idx].assignee,
        };
        list[idx] = updated;
        foundTask = updated;
        foundProjectId = pid;
        break;
      }
    }

    if (!foundTask) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    this.persist();
    return foundTask;
  }

  async remove(taskId: string): Promise<void> {
    for (const [pid, list] of Object.entries(this.tasksByProject)) {
      const filtered = list.filter(t => t.id !== taskId);
      if (filtered.length !== list.length) {
        this.tasksByProject[pid] = filtered;
        break;
      }
    }
    this.persist();
  }
}
