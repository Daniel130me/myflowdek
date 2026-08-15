import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { disconnectStorage, parseStorageProvider } from '@/server/storage/storage.service';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { provider: slug } = await params;
    await disconnectStorage(user.id, parseStorageProvider(slug));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
