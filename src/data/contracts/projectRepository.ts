import type { Project } from '@/features/flowdeck/model';

export interface CreateProjectInput {
  name: string;
  color?: string;
  description?: string;
  members?: string[];
  start?: string;
  end?: string;
}

export interface UpdateProjectInput {
  name?: string;
  color?: string;
  description?: string;
  members?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
  start?: string;
  end?: string;
}

export interface ProjectRepository {
  listAll(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  remove(id: string): Promise<void>;
}
