import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/server/db/client';
import {
  baseUrl,
  completeAuthorization,
  extractAndVerifyOAuthState,
  parseStorageProvider,
} from '@/server/storage/storage.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  let fallbackOrigin: string;
  try {
    fallbackOrigin = baseUrl(request);
  } catch {
    const parsed = new URL(request.url);
    fallbackOrigin = parsed.origin;
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/settings?storage_error=${encodeURIComponent(oauthError)}`, fallbackOrigin),
    );
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings?storage_error=Missing+OAuth+code+or+state', fallbackOrigin),
    );
  }

  try {
    const { provider: slug } = await params;
    const provider = parseStorageProvider(slug);

    // 1. Verify HMAC state signature and extract verified user id
    const stateUserId = extractAndVerifyOAuthState(state, provider);

    // 2. Validate current session if available; fail if there is an active session for a different user
    const session = await getServerSession(authOptions);
    if (session?.user?.id && session.user.id !== stateUserId) {
      return NextResponse.redirect(
        new URL('/settings?storage_error=OAuth+session+mismatch', fallbackOrigin),
      );
    }

    // 3. Verify user is in active status in DB
    const dbUser = await db.user.findUnique({
      where: { id: stateUserId },
      select: { id: true, status: true },
    });
    if (!dbUser || dbUser.status !== 'ACTIVE') {
      return NextResponse.redirect(
        new URL('/settings?storage_error=Account+not+found+or+inactive', fallbackOrigin),
      );
    }

    // 4. Exchange authorization code for tokens and persist connection
    await completeAuthorization(provider, stateUserId, code, state, request);

    // 5. Redirect successfully to settings
    return NextResponse.redirect(new URL('/settings?storage=connected', fallbackOrigin));
  } catch (error) {
    console.error('[storage callback error]', error);
    const message = error instanceof Error ? error.message : 'Storage connection failed';
    return NextResponse.redirect(
      new URL(`/settings?storage_error=${encodeURIComponent(message)}`, fallbackOrigin),
    );
  }
}

