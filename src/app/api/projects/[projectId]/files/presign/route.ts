import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { generatePresignedUploadUrl, buildR2Key } from '@/server/files/r2.service';

/** Max upload size: 50 MB. */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const presignSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  size: z.number().int().positive().max(MAX_FILE_SIZE, 'File too large (max 50 MB)'),
});

/**
 * POST /api/projects/:projectId/files/presign
 *
 * Request a presigned R2 upload URL. The browser will upload the file
 * directly to R2 using this URL, then call /confirm to store the metadata.
 *
 * Flowdek verifies project membership + upload capability before issuing
 * the URL.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'UPLOAD_FILES');

    const body = await request.json().catch(() => null);
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { fileName, mimeType, size } = parsed.data;
    const r2Key = buildR2Key(projectId, fileName);

    const uploadUrl = await generatePresignedUploadUrl(r2Key, mimeType, size);

    return NextResponse.json({
      uploadUrl,
      r2Key,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
    });
  } catch (error) {
    // If R2 is not configured, return a clear error.
    if (error instanceof Error && error.message.includes('R2')) {
      return NextResponse.json(
        { error: 'File storage is not configured' },
        { status: 503 },
      );
    }
    return authErrorResponse(error);
  }
}
