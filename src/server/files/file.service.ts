import type { StorageProvider } from '@prisma/client';
import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';
import { deleteFromConnection } from '@/server/storage/storage.service';

export const createFileSchema = z.object({
  name: z.string().trim().min(1, 'File name is required').max(255),
  size: z.number().int().nonnegative().optional(),
  taskId: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
});

export type CreateFileInput = z.infer<typeof createFileSchema>;

interface CreateProviderFileInput {
  name: string;
  size: number;
  mimeType: string;
  taskId?: string | null;
  storageProvider: StorageProvider;
  storageConnectionId: string;
  providerFileId: string;
  providerPath: string;
  providerWebUrl?: string;
}

const fileSelect = {
  id: true,
  projectId: true,
  taskId: true,
  name: true,
  size: true,
  mimeType: true,
  storageProvider: true,
  providerWebUrl: true,
  uploadedById: true,
  uploadedAt: true,
  url: true,
  thumbnailUrl: true,
} as const;

/** List provider metadata only; file bytes stay in the user's cloud drive. */
export function listFiles(projectId: string) {
  return db.file.findMany({
    where: { projectId },
    select: { ...fileSelect, uploadedBy: { select: { id: true, name: true, avatarColor: true } } },
    orderBy: { uploadedAt: 'desc' },
  });
}

/** Create a legacy external-link record. Binary uploads use createProviderFile. */
export async function createFile(projectId: string, uploadedById: string, input: CreateFileInput) {
  return db.file.create({
    data: {
      projectId,
      taskId: input.taskId ?? null,
      name: input.name,
      size: input.size ?? 0,
      uploadedById,
      url: input.url ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
    },
    select: { ...fileSelect, uploadedBy: { select: { id: true, name: true, avatarColor: true } } },
  });
}

export function createProviderFile(
  projectId: string,
  uploadedById: string,
  input: CreateProviderFileInput,
) {
  return db.file.create({
    data: {
      projectId,
      uploadedById,
      taskId: input.taskId ?? null,
      name: input.name,
      size: input.size,
      mimeType: input.mimeType,
      storageProvider: input.storageProvider,
      storageConnectionId: input.storageConnectionId,
      providerFileId: input.providerFileId,
      providerPath: input.providerPath,
      providerWebUrl: input.providerWebUrl ?? null,
    },
    select: { ...fileSelect, uploadedBy: { select: { id: true, name: true, avatarColor: true } } },
  });
}

/** Delete from the user's provider first, then remove Flowdek metadata. */
export async function deleteFile(fileId: string, userId: string, isManager: boolean) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: {
      uploadedById: true,
      providerFileId: true,
      providerPath: true,
      storageConnection: true,
    },
  });
  if (!file) throw new AuthError('File not found', 404);
  if (file.uploadedById !== userId && !isManager) {
    throw new AuthError('You can only delete files you uploaded', 403);
  }

  if (file.storageConnection && file.providerFileId) {
    await deleteFromConnection(file.storageConnection, file.providerFileId, file.providerPath);
  }
  await db.file.delete({ where: { id: fileId } });
}

/** Compatibility guard used only by the legacy R2 confirmation endpoint. */
export function validateR2KeyForProject(r2Key: string, projectId: string): boolean {
  return r2Key.startsWith(`projects/${projectId}/`);
}
