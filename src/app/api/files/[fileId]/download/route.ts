import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { generatePresignedDownloadUrl } from '@/server/files/r2.service';
import { downloadFromConnection } from '@/server/storage/storage.service';

/**
 * GET /api/files/:fileId/download
 *
 * Returns a presigned download URL for a file stored in R2. The browser
 * redirects to this URL to download the actual file. Flowdek verifies the
 * caller is a project member before issuing the URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { fileId } = await params;

    const file = await db.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        name: true,
        r2Key: true,
        projectId: true,
        mimeType: true,
        providerFileId: true,
        providerPath: true,
        storageConnection: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify the caller is a member of the file's project.
    await requireProjectCapability(user.id, file.projectId, 'VIEW_PROJECT');

    if (file.storageConnection && file.providerFileId) {
      const providerResponse = await downloadFromConnection(
        file.storageConnection,
        file.providerFileId,
        file.providerPath,
      );
      if (!providerResponse.ok || !providerResponse.body) {
        return NextResponse.json({ error: 'Storage provider could not download the file' }, { status: 502 });
      }
      return new Response(providerResponse.body, {
        headers: { 'Content-Type': file.mimeType ?? 'application/octet-stream' },
      });
    }

    // Compatibility-only fallback for files uploaded before connected storage.
    if (!file.r2Key) {
      return NextResponse.json(
        { error: 'File has no R2 key — it may be a legacy mock file' },
        { status: 404 },
      );
    }

    const downloadUrl = await generatePresignedDownloadUrl(file.r2Key);

    return NextResponse.json({
      downloadUrl,
      fileName: file.name,
      mimeType: file.mimeType,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('R2')) {
      return NextResponse.json(
        { error: 'File storage is not configured' },
        { status: 503 },
      );
    }
    return authErrorResponse(error);
  }
}
