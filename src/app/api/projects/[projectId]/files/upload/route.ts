import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import { createProviderFile } from '@/server/files/file.service';
import {
  deleteFromConnection,
  getOwnedConnection,
  parseStorageProvider,
  uploadToConnection,
} from '@/server/storage/storage.service';
import { recordActivity } from '@/server/activity/activity.service';
import { ACTIVITY_TYPES } from '@/server/activity/constants';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const uploadFields = z.object({
  provider: z.string().min(1),
  taskId: z.string().optional().nullable(),
});

/** Stream an incoming browser file onward to the user's connected provider. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'UPLOAD_FILES');
    const form = await request.formData();
    const parsed = uploadFields.safeParse({ provider: form.get('provider'), taskId: form.get('taskId') || null });
    const uploaded = form.get('file');
    if (!parsed.success || !(uploaded instanceof File)) {
      return NextResponse.json({ error: 'A provider and file are required' }, { status: 400 });
    }
    if (uploaded.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Files must be 50 MB or smaller' }, { status: 413 });
    }

    const provider = parseStorageProvider(parsed.data.provider);
    const connection = await getOwnedConnection(user.id, provider);
    const mimeType = uploaded.type || 'application/octet-stream';
    const providerFile = await uploadToConnection(
      connection,
      projectId,
      uploaded.name,
      mimeType,
      Buffer.from(await uploaded.arrayBuffer()),
    );
    let file: Awaited<ReturnType<typeof createProviderFile>>;
    try {
      file = await createProviderFile(projectId, user.id, {
        name: uploaded.name,
        size: uploaded.size,
        mimeType,
        taskId: parsed.data.taskId,
        storageProvider: provider,
        storageConnectionId: connection.id,
        providerFileId: providerFile.id,
        providerPath: providerFile.path,
        providerWebUrl: providerFile.webUrl,
      });
    } catch (error) {
      // Compensate for a metadata failure so the user's drive is not left
      // with an orphaned upload that Flowdek cannot display or manage.
      await deleteFromConnection(connection, providerFile.id, providerFile.path).catch(() => undefined);
      throw error;
    }
    if (parsed.data.taskId) {
      await recordActivity(parsed.data.taskId, projectId, user.id, ACTIVITY_TYPES.FILE_UPLOADED, `uploaded ${uploaded.name}`);
    }
    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
