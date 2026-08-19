import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { getFileProviderAdapter } from '@/server/storage/providers';
import { parseStorageProvider } from '@/server/storage/storage.service';

/** GET /api/storage/files?provider=google-drive&query=foo — list/search files from connected provider */
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const providerSlug = url.searchParams.get('provider') || 'google-drive';
    const query = url.searchParams.get('query') || '';

    const providerEnum = parseStorageProvider(providerSlug);
    const connection = await db.storageConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: providerEnum } },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        files: [],
        message: 'No active storage connection found for this provider.',
      });
    }

    const adapter = getFileProviderAdapter(providerEnum);
    const files = await adapter.listFiles(connection, query);

    return NextResponse.json({
      connected: true,
      provider: providerSlug,
      accountEmail: connection.providerEmail,
      files,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
