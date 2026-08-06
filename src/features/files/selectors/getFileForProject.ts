import type { FileItem } from '@/features/flowdeck/model';

export function getFileForProject(
  filesByProject: Record<string, FileItem[]>,
  projectId: string,
  fileId: string
): FileItem | null {
  if (!projectId || !fileId || !filesByProject[projectId]) {
    return null;
  }
  return filesByProject[projectId].find(file => file.id === fileId) ?? null;
}
