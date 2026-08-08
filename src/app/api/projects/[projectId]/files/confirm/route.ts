import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  authErrorResponse,
} from '@/server/auth/authorization';
import { createFile } from '@/server/files/file.service';
import { recordActivity } from '@/server/activity/activity.service';
import { ACTIVITY_TYPES } from '@/server/activity/constants';

const confirmSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100).optional(),
  size: z.number().int().nonnegative().optional(),
  r2Key: z.string().trim().min(1),
  taskId: z.string().optional().nullable(),
});

/**
 * POST /api/projects/:projectId/files/confirm
 *
 * After the browser uploads directly to R2 using the presigned URL, it calls
 * this endpoint to store the file metadata in the database. The application
 * server never handles the binary.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);

    const body = await request.json().catch(() => null);
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { fileName, mimeType, size, r2Key, taskId } = parsed.data;

    // Store only the metadata — the binary is already in R2.
    const file = await createFile(projectId, user.id, {
      name: fileName,
      size: size,
      taskId: taskId,
      // Store the r2Key (not a URL) so we can generate presigned download URLs later.
      // The `url` field is kept null — downloads go through the /download endpoint.
      url: undefined,
      thumbnailUrl: undefined,
    });

    // Update the file record with the R2 key and MIME type.
    // (file.service.createFile doesn't set r2Key/mimeType — we do it here.)
    const { db } = await import('@/server/db/client');
    await db.file.update({
      where: { id: file.id },
      data: {
        r2Key,
        mimeType: mimeType ?? null,
      },
    });

    // Record activity if the file is linked to a task.
    if (taskId) {
      await recordActivity(
        taskId,
        projectId,
        user.id,
        ACTIVITY_TYPES.FILE_UPLOADED,
        `uploaded "${fileName}"`,
      );
    }

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
