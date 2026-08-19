import type { StorageProvider } from '@prisma/client';
import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';
import { deleteFromConnection } from '@/server/storage/storage.service';
import { getFileProviderAdapter } from '@/server/storage/providers';

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

export async function attachConnectedFile(
  projectId: string,
  userId: string,
  input: { provider: StorageProvider; providerFileId: string; taskId?: string | null },
) {
  const connection = await db.storageConnection.findUnique({
    where: { userId_provider: { userId, provider: input.provider } },
  });
  if (!connection) {
    throw new AuthError(`Please connect your ${input.provider} account in Settings before attaching files.`, 409);
  }

  const adapter = getFileProviderAdapter(input.provider);
  const metadata = await adapter.getFileMetadata(connection, input.providerFileId);

  return db.file.create({
    data: {
      projectId,
      uploadedById: userId,
      taskId: input.taskId ?? null,
      name: metadata.name,
      size: metadata.size,
      mimeType: metadata.mimeType,
      storageProvider: input.provider,
      storageConnectionId: connection.id,
      providerFileId: metadata.id,
      providerWebUrl: metadata.webUrl ?? null,
      thumbnailUrl: metadata.thumbnailUrl ?? null,
      url: metadata.webUrl ?? null,
    },
    select: { ...fileSelect, uploadedBy: { select: { id: true, name: true, avatarColor: true } } },
  });
}

export async function shareFileWithTeammate(
  fileId: string,
  callerUserId: string,
  targetEmail: string,
  role: 'reader' | 'writer' = 'reader',
) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { storageConnection: true },
  });
  if (!file) throw new AuthError('File not found', 404);
  if (!file.storageProvider || !file.providerFileId) {
    throw new AuthError('Sharing is only supported for cloud provider files', 400);
  }

  // Find caller's connection or file owner's connection
  const connection = file.storageConnection ?? await db.storageConnection.findUnique({
    where: { userId_provider: { userId: callerUserId, provider: file.storageProvider } },
  });

  if (!connection) {
    throw new AuthError('No storage connection available to apply provider permissions', 409);
  }

  const adapter = getFileProviderAdapter(file.storageProvider);
  await adapter.shareFile(connection, file.providerFileId, { email: targetEmail, role });
}

/** Delete Flowdek file reference metadata. */
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
    throw new AuthError('You can only remove files you attached', 403);
  }

  // Delete Flowdek attachment record
  await db.file.delete({ where: { id: fileId } });
}

/** Compatibility guard used only by the legacy R2 confirmation endpoint. */
export function validateR2KeyForProject(r2Key: string, projectId: string): boolean {
  return r2Key.startsWith(`projects/${projectId}/`);
}
