import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { completeAuthorization, parseStorageProvider } from '@/server/storage/storage.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { provider: slug } = await params;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) return NextResponse.json({ error: 'Missing OAuth response' }, { status: 400 });
    await completeAuthorization(parseStorageProvider(slug), user.id, code, state, request);
    const destination = new URL('/settings?storage=connected', url.origin);
    return NextResponse.redirect(destination);
  } catch (error) {
    return authErrorResponse(error);
  }
}
