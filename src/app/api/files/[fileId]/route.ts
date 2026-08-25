import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { deleteFile } from '@/server/files/file.service';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { fileId } = await params;
    const file = await db.file.findUnique({ where: { id: fileId }, select: { projectId: true } });
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    const membership = await requireProjectCapability(user.id, file.projectId, 'VIEW_PROJECT');
    await deleteFile(fileId, user.id, membership.role === 'OWNER' || membership.role === 'ADMIN');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
