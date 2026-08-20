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

/**
 * Share a connected-provider file with a teammate via the provider's
 * permissions API (e.g. Google Drive permissions).
 *
 * Authorization policy:
 *   - Only the file owner (uploadedById) OR a project MANAGER/ADMIN/OWNER
 *     can share a file. Ordinary VIEWERs and MEMBERs cannot mutate
 *     another user's Google Drive permissions — that would allow them
 *     to grant arbitrary external emails access to files they don't own.
 *   - The target email MUST be a member of the same project (or workspace).
 *     This prevents sharing with arbitrary external emails under the guise
 *     of "share with teammate". If the target is not a project/workspace
 *     member, the request is rejected.
 *   - The caller's own OAuth connection is used — NOT the file owner's —
 *     so the permission is applied under the caller's identity, and only
 *     if the caller has their own connected storage.
 */
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

  // Authorization: only the file owner OR a project MANAGER+ can share.
  const isFileOwner = file.uploadedById === callerUserId;
  if (!isFileOwner) {
    const callerMembership = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: file.projectId, userId: callerUserId } },
      select: { role: true },
    });
    if (!callerMembership) {
      throw new AuthError('You do not have access to this project', 403);
    }
    const managerRoles = ['OWNER', 'ADMIN'];
    if (!managerRoles.includes(callerMembership.role)) {
      throw new AuthError(
        'Only the file owner or a project manager can share connected files',
        403,
      );
    }
  }

  // Validate that the target email is a project or workspace member.
  // This prevents sharing with arbitrary external emails.
  const targetUser = await db.user.findUnique({
    where: { email: targetEmail.toLowerCase() },
    select: { id: true },
  });
  if (!targetUser) {
    throw new AuthError(
      'The recipient is not a Flowdek user. Only project/workspace members can be shared with.',
      400,
    );
  }
  const targetIsProjectMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: file.projectId, userId: targetUser.id } },
    select: { userId: true },
  });
  if (!targetIsProjectMember) {
    // Check workspace membership as a fallback.
    const workspace = await db.workspace.findFirst({
      where: { projects: { some: { id: file.projectId } } },
      select: { id: true },
    });
    if (workspace) {
      const targetIsWorkspaceMember = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: targetUser.id } },
        select: { userId: true },
      });
      if (!targetIsWorkspaceMember) {
        throw new AuthError(
          'The recipient is not a member of this project or workspace',
          400,
        );
      }
    } else {
      throw new AuthError(
        'The recipient is not a member of this project',
        400,
      );
    }
  }

  // Use the CALLER's own OAuth connection — NOT the file owner's — so
  // the permission is applied under the caller's identity. If the caller
  // doesn't have their own connected storage for this provider, reject.
  const connection = await db.storageConnection.findUnique({
    where: { userId_provider: { userId: callerUserId, provider: file.storageProvider } },
  });
  if (!connection) {
    throw new AuthError(
      `You must connect your own ${file.storageProvider} account in Settings before sharing files`,
      409,
    );
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
