import { NextResponse } from 'next/server';
import {
  authErrorResponse,
  requireAuthenticatedUser,
  requireProjectCapability,
} from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { updateProjectDocumentContentSchema } from '@/server/documents/schemas';
import { getFileContent, updateFileContent } from '@/server/files/file-content.service';

async function authorizeFile(userId: string, fileId: string) {
  const file = await db.file.findUnique({ where: { id: fileId }, select: { projectId: true } });
  if (!file) return null;
  const membership = await requireProjectCapability(userId, file.projectId, 'VIEW_PROJECT');
  return { file, membership };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { fileId } = await params;
    const authorization = await authorizeFile(user.id, fileId);
    if (!authorization) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const result = await getFileContent(fileId, user.id, authorization.membership.role);
    return NextResponse.json({ content: result.content, canEdit: result.canEdit });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { fileId } = await params;
    const authorization = await authorizeFile(user.id, fileId);
    if (!authorization) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const parsed = updateProjectDocumentContentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const result = await updateFileContent(
      fileId,
      user.id,
      authorization.membership.role,
      parsed.data,
    );
    return NextResponse.json({ content: result.content, canEdit: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
