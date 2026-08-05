import type { ProjectRepository, CreateProjectInput, UpdateProjectInput } from '../contracts/projectRepository';
import type { Project } from '@/features/flowdeck/model';
import { INITIAL_PROJECTS } from '@/features/flowdeck/model/data';
import { loadPersistedState, savePersistedState } from '../local-storage/storageAdapter';
import { defaultIdGenerator } from '@/shared/utils/id';

export class MockProjectRepository implements ProjectRepository {
  private projects: Record<string, Project>;

  constructor() {
    const persisted = loadPersistedState();
    if (persisted && persisted.projects) {
      this.projects = persisted.projects as Record<string, Project>;
    } else {
      this.projects = INITIAL_PROJECTS;
    }
  }

  private persist() {
    savePersistedState({ projects: this.projects });
  }

  async listAll(): Promise<Project[]> {
    return Object.values(this.projects);
  }

  async getById(id: string): Promise<Project | null> {
    return this.projects[id] || null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const id = defaultIdGenerator.generate('p');
    const newProject: Project = {
      id,
      name: input.name,
      color: input.color || '#FE8029',
      start: input.start || new Date().toISOString().slice(0, 10),
      end: input.end || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      description: input.description || '',
      members: input.members || ['u1'],
      isFavorite: false,
      isArchived: false,
    };

    this.projects[id] = newProject;
    this.persist();
    return newProject;
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const existing = this.projects[id];
    if (!existing) {
      throw new Error(`Project ${id} not found`);
    }

    const updated: Project = {
      ...existing,
      ...input,
    };

    this.projects[id] = updated;
    this.persist();
    return updated;
  }

  async remove(id: string): Promise<void> {
    delete this.projects[id];
    this.persist();
  }
}
