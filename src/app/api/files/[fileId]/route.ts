import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { deleteFile, updateFileTaskLink } from '@/server/files/file.service';
import { z } from 'zod';

const updateFileLinkSchema = z.object({ taskId: z.string().min(1).nullable() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { fileId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = updateFileLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'A valid taskId or null is required' }, { status: 400 });
    }

    const file = await db.file.findUnique({ where: { id: fileId }, select: { projectId: true } });
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    await requireProjectCapability(user.id, file.projectId, 'EDIT_TASK');
    const updated = await updateFileTaskLink(fileId, file.projectId, parsed.data.taskId);
    return NextResponse.json({ file: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}

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
