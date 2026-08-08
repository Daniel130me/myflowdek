import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createFileSchema = z.object({
  name: z.string().trim().min(1, 'File name is required').max(255),
  size: z.number().int().nonnegative().optional(),
  taskId: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
});

export type CreateFileInput = z.infer<typeof createFileSchema>;

const fileSelect = {
  id: true,
  projectId: true,
  taskId: true,
  name: true,
  size: true,
  uploadedById: true,
  uploadedAt: true,
  url: true,
  thumbnailUrl: true,
} as const;

/** List files for a project. */
export function listFiles(projectId: string) {
  return db.file.findMany({
    where: { projectId },
    select: { ...fileSelect, uploadedBy: { select: { id: true, name: true, avatarColor: true } } },
    orderBy: { uploadedAt: 'desc' },
  });
}

/** Create a file record. uploadedById always from the session. */
export async function createFile(
  projectId: string,
  uploadedById: string,
  input: CreateFileInput,
) {
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

/** Delete a file. Only the uploader or a project manager. */
export async function deleteFile(fileId: string, userId: string, isManager: boolean) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { uploadedById: true },
  });
  if (!file) throw new AuthError('File not found', 404);

  if (file.uploadedById !== userId && !isManager) {
    throw new AuthError('You can only delete files you uploaded', 403);
  }

  await db.file.delete({ where: { id: fileId } });
}
