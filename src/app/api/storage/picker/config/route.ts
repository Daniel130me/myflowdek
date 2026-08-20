import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { getValidAccessToken } from '@/server/storage/storage.service';

/**
 * GET /api/storage/picker/config
 *
 * Returns the configuration needed to open a Google Picker on the client.
 *
 * Google Picker is the correct way to let users browse their full Google
 * Drive while keeping the `drive.file` scope (which only grants access to
 * files the user explicitly selects). With `drive.file`, the Drive API
 * `files.list` endpoint returns an empty list for newly connected accounts
 * because the app hasn't been granted access to any files yet — the Picker
 * is what grants per-file access.
 *
 * Response shape:
 *   {
 *     clientId: string,        // Google OAuth client ID (for Picker API)
 *     appId: string,           // Google Cloud project number (for Picker)
 *     accessToken: string,     // Valid OAuth token for the connected user
 *     developerKey: string | null  // API key if configured (optional)
 *   }
 *
 * The frontend uses this to construct a `google.picker.PickerBuilder` and
 * open the native Google file selection dialog. After selection, the
 * frontend sends only the `providerFileId` to the attach endpoint.
 */
export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    // Find the user's Google Drive connection.
    const connection = await db.storageConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'GOOGLE_DRIVE' } },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Google Drive is not connected. Connect it in Settings first.' },
        { status: 409 },
      );
    }

    // Get a valid (potentially refreshed) access token.
    const accessToken = await getValidAccessToken(connection);

    // The client ID is the same OAuth client used for the connection.
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Google Drive OAuth is not configured on the server.' },
        { status: 500 },
      );
    }

    // The app ID is the project number from Google Cloud Console.
    // It's derived from the client ID (the numeric prefix before '.apps.googleusercontent.com').
    const appId = process.env.GOOGLE_DRIVE_APP_ID
      ?? clientId.split('-')[0].split('.')[0];

    // The developer key (API key) is optional for Picker when using OAuth tokens.
    const developerKey = process.env.GOOGLE_DRIVE_DEVELOPER_KEY ?? null;

    return NextResponse.json({
      clientId,
      appId,
      accessToken,
      developerKey,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
