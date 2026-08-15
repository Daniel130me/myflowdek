import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { listStorageConnections } from '@/server/storage/storage.service';

/** List connected accounts without ever returning OAuth credentials. */
export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const connections = await listStorageConnections(user.id);
    return NextResponse.json({ connections });
  } catch (error) {
    return authErrorResponse(error);
  }
}
