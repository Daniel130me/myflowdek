import type { ProjectRole, StorageProvider } from '@prisma/client';
import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { audit } from '@/server/audit/log';
import { getDocumentProviderAdapter } from '@/server/documents/providers';
import type { IDocumentProviderAdapter } from '@/server/documents/providers';
import type { ProviderDocumentUpdate } from '@/server/documents/types';

const managerRoles: ProjectRole[] = ['OWNER', 'ADMIN'];

export type FileContentProviderFactory = (provider: StorageProvider) => IDocumentProviderAdapter;

function canManageFile(uploadedById: string | null, userId: string, role: ProjectRole): boolean {
  return uploadedById === userId || managerRoles.includes(role);
}

function findFileWithConnection(fileId: string) {
  return db.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      projectId: true,
      uploadedById: true,
      storageProvider: true,
      providerFileId: true,
      mimeType: true,
      storageConnection: true,
    },
  });
}

export async function getFileContent(
  fileId: string,
  userId: string,
  role: ProjectRole,
  providerFactory: FileContentProviderFactory = getDocumentProviderAdapter,
) {
  const file = await findFileWithConnection(fileId);
  if (!file) throw new AuthError('File not found', 404);
  if (!file.storageProvider || !file.providerFileId || !file.storageConnection) {
    throw new AuthError('This file is not connected to an available cloud provider.', 400);
  }

  const provider = providerFactory(file.storageProvider);
  const content = await provider.readContent(
    file.storageConnection,
    file.providerFileId,
    file.mimeType,
  );

  return {
    projectId: file.projectId,
    content,
    canEdit: canManageFile(file.uploadedById, userId, role),
  };
}

export async function updateFileContent(
  fileId: string,
  userId: string,
  role: ProjectRole,
  update: ProviderDocumentUpdate,
  providerFactory: FileContentProviderFactory = getDocumentProviderAdapter,
) {
  const file = await findFileWithConnection(fileId);
  if (!file) throw new AuthError('File not found', 404);
  if (!file.storageProvider || !file.providerFileId || !file.storageConnection) {
    throw new AuthError('This file is not connected to an available cloud provider.', 400);
  }
  if (!canManageFile(file.uploadedById, userId, role)) {
    throw new AuthError('Only the file owner or a project manager can edit it', 403);
  }

  const provider = providerFactory(file.storageProvider);
  const content = await provider.updateContent(
    file.storageConnection,
    file.providerFileId,
    file.mimeType,
    update,
  );

  await audit({
    userId,
    action: 'file_content_updated',
    meta: { projectId: file.projectId, fileId: file.id, contentKind: update.kind },
  });

  return { projectId: file.projectId, content };
}
