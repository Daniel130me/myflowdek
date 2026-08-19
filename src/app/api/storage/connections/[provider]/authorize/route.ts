import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { authorizationUrl, parseStorageProvider } from '@/server/storage/storage.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { provider: slug } = await params;
    return NextResponse.redirect(authorizationUrl(parseStorageProvider(slug), user.id, request));
  } catch (error) {
    return authErrorResponse(error);
  }
}
