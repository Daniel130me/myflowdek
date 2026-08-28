'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiCreateProject, apiCreateProjectFromTemplate } from '@/lib/api-client';
import { routes } from '@/shared/navigation/routes';
import { useWorkspaces } from './useWorkspaces';
import { mapProject, PROJECT_CREATED_EVENT, type ApiProject } from './useProjects';
import { useFlowDeck } from '../store/useFlowDeck';

interface ProjectFormInput {
  name: string;
  color: string;
  start: string;
  end: string;
}

/** Shared persistence flow used by both full-page and intercepted modals. */
export function useProjectCreation(options: { navigateOnCreate?: boolean; navigateOnTemplateCreate?: boolean } = {}) {
  const router = useRouter();
  const { selectedWorkspaceId } = useWorkspaces();
  const { upsertProject } = useFlowDeck();
  const [creating, setCreating] = useState(false);

  const finish = useCallback((apiProject: ApiProject, workspaceId: string, navigate = true) => {
    const project = mapProject(apiProject);
    upsertProject(project);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PROJECT_CREATED_EVENT, {
        detail: { workspaceId, project },
      }));
    }
    toast.success('Project created', { description: project.name });
    if (navigate) router.push(routes.projectOverview(project.id));
    return true;
  }, [router, upsertProject]);

  const createBlank = useCallback(async (input: ProjectFormInput) => {
    if (!selectedWorkspaceId || creating) return;
    setCreating(true);
    try {
      const result = await apiCreateProject(selectedWorkspaceId, {
        name: input.name,
        color: input.color,
        startDate: input.start,
        endDate: input.end,
      });
      if (!result.ok || !result.data?.project) {
        throw new Error(result.error ?? 'Failed to create project');
      }
      return finish(result.data.project as unknown as ApiProject, selectedWorkspaceId, options.navigateOnCreate !== false);
    } catch (error) {
      toast.error('Failed to create project', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    } finally {
      setCreating(false);
    }
  }, [creating, finish, options.navigateOnCreate, selectedWorkspaceId]);

  const createFromTemplate = useCallback(async (
    templateId: string,
    name: string,
    color: string,
    start: string,
    end: string,
  ) => {
    if (!selectedWorkspaceId || creating) return;
    setCreating(true);
    try {
      const result = await apiCreateProjectFromTemplate(selectedWorkspaceId, {
        templateId,
        name,
        color,
        startDate: start,
        endDate: end,
      });
      if (!result.ok || !result.data?.project) {
        throw new Error(result.error ?? 'Failed to create project from template');
      }
      return finish(result.data.project as unknown as ApiProject, selectedWorkspaceId, options.navigateOnTemplateCreate !== false);
    } catch (error) {
      toast.error('Failed to create project from template', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    } finally {
      setCreating(false);
    }
  }, [creating, finish, options.navigateOnTemplateCreate, selectedWorkspaceId]);

  return { createBlank, createFromTemplate, creating };
}
