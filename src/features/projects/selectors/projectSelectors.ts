import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import type {
  Project,
  Task,
  FileItem,
  Tag,
  Comment,
  ActivityEntry,
  TimeLog,
  CustomColumn,
  Section,
} from '@/features/flowdeck/model';

export function useProjectById(projectId: string): Project | null {
  const state = useFlowDeck();
  return (projectId && state.projects[projectId]) || null;
}

export function useProjectTasks(projectId: string): Task[] {
  const state = useFlowDeck();
  return (projectId && state.tasksByProject[projectId]) || [];
}

export function useProjectFiles(projectId: string): FileItem[] {
  const state = useFlowDeck();
  return (projectId && state.filesByProject[projectId]) || [];
}

export function useProjectTags(projectId: string): Tag[] {
  const state = useFlowDeck();
  return (projectId && state.tagsByProject[projectId]) || [];
}

export function useProjectComments(projectId: string): Comment[] {
  const state = useFlowDeck();
  return (projectId && state.commentsByProject[projectId]) || [];
}

export function useProjectActivity(projectId: string): ActivityEntry[] {
  const state = useFlowDeck();
  return (projectId && state.activityByProject[projectId]) || [];
}

export function useProjectTimeLogs(projectId: string): TimeLog[] {
  const state = useFlowDeck();
  return (projectId && state.timeLogsByProject[projectId]) || [];
}

export function useProjectCustomFields(projectId: string): CustomColumn[] {
  const state = useFlowDeck();
  return (projectId && state.customColsByProject[projectId]) || [];
}

export function useProjectSections(projectId: string): Section[] {
  const state = useFlowDeck();
  return (projectId && state.sectionsByProject[projectId]) || [];
}
