import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { generatePresignedDownloadUrl } from '@/server/files/r2.service';

/**
 * GET /api/files/:fileId/download
 *
 * Returns a download URL for a file.
 *
 * For LEGACY R2 files (files uploaded directly to R2 before connected
 * storage was introduced), this returns a presigned R2 download URL.
 *
 * For CONNECTED-PROVIDER files (Google Drive, OneDrive, Dropbox), this
 * route does NOT proxy or stream the file bytes through Flowdek. Instead,
 * it returns the provider's direct web URL (e.g. Google Drive webViewLink)
 * so the browser opens/redirects directly to the provider. The file stays
 * provider-hosted — Flowdek never downloads or copies it.
 *
 * This route is kept for legacy R2 compatibility only. Connected-provider
 * files should use the `providerWebUrl` field from the file record directly
 * (e.g. open in a new tab) rather than calling this endpoint.
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
        storageProvider: true,
        providerFileId: true,
        providerWebUrl: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify the caller is a member of the file's project.
    await requireProjectCapability(user.id, file.projectId, 'VIEW_PROJECT');

    // Connected-provider files: return the provider's direct web URL.
    // Do NOT proxy the file bytes through Flowdek.
    if (file.storageProvider && file.providerFileId) {
      return NextResponse.json({
        providerWebUrl: file.providerWebUrl,
        fileName: file.name,
        mimeType: file.mimeType,
        message: 'This file is hosted by a connected storage provider. Open the providerWebUrl directly.',
      });
    }

    // Legacy R2 files: return a presigned download URL.
    if (!file.r2Key) {
      return NextResponse.json(
        { error: 'File has no R2 key and is not a connected-provider file' },
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
