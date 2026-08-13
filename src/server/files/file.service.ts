import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

/** Prefix that all R2 keys must have for a given project. Used to
 *  validate that a confirm request isn't claiming another project's file. */
function buildExpectedKeyPrefix(projectId: string): string {
  return `projects/${projectId}/`;
}

/** Delete an R2 object by its key. Non-fatal — if the R2 delete fails,
 *  the DB record is still removed (the orphaned object can be cleaned up
 *  by a background job later). */
async function deleteR2Object(r2Key: string): Promise<void> {
  try {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) return; // R2 not configured (dev mode)

    const endpoint = process.env.R2_ENDPOINT
      ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const bucket = process.env.R2_BUCKET_NAME ?? process.env.R2_BUCKET;
    if (!bucket) return;

    const client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }));
  } catch (err) {
    // Log but don't throw — DB record is still removed.
    console.error('[files] R2 object deletion failed for', r2Key, err);
  }
}

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

/** Delete a file — removes both the DB record AND the R2 object.
 *  Only the uploader or a project manager can delete.
 *  Strategy: delete DB record first (so the file is immediately gone from
 *  the UI), then delete the R2 object (non-fatal if it fails). */
export async function deleteFile(fileId: string, userId: string, isManager: boolean) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { uploadedById: true, r2Key: true },
  });
  if (!file) throw new AuthError('File not found', 404);

  if (file.uploadedById !== userId && !isManager) {
    throw new AuthError('You can only delete files you uploaded', 403);
  }

  // Delete the DB record first.
  await db.file.delete({ where: { id: fileId } });

  // Then delete the R2 object (if it exists). Non-fatal on failure.
  if (file.r2Key) {
    await deleteR2Object(file.r2Key);
  }
}

/** Validate that an r2Key belongs to the specified project.
 *  This prevents users from claiming R2 objects from other projects. */
export function validateR2KeyForProject(r2Key: string, projectId: string): boolean {
  return r2Key.startsWith(buildExpectedKeyPrefix(projectId));
}
