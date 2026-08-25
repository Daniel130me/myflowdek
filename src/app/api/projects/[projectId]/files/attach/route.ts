import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import { attachConnectedFile } from '@/server/files/file.service';
import { parseStorageProvider } from '@/server/storage/storage.service';
import { recordActivity } from '@/server/activity/activity.service';
import { ACTIVITY_TYPES } from '@/server/activity/constants';

const attachSchema = z.object({
  provider: z.string().min(1),
  providerFileId: z.string().min(1),
  taskId: z.string().optional().nullable(),
});

/** POST /api/projects/:projectId/files/attach — attach a cloud provider file by metadata reference */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'UPLOAD_FILES');

    const body = await request.json().catch(() => ({}));
    const parsed = attachSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Provider and providerFileId are required' },
        { status: 400 },
      );
    }

    const providerEnum = parseStorageProvider(parsed.data.provider);
    const file = await attachConnectedFile(projectId, user.id, {
      provider: providerEnum,
      providerFileId: parsed.data.providerFileId,
      taskId: parsed.data.taskId,
    });

    if (parsed.data.taskId) {
      await recordActivity(
        parsed.data.taskId,
        projectId,
        user.id,
        ACTIVITY_TYPES.FILE_UPLOADED,
        `attached connected file ${file.name}`,
      );
    }

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
