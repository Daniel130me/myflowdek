import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { listFiles, createFile } from '@/server/files/file.service';
import { createFileSchema } from '@/server/files/file.service';

/** GET /api/projects/:projectId/files — list files. Any project member. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const files = await listFiles(projectId);
    return NextResponse.json({ files });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/projects/:projectId/files — create a file record. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'UPLOAD_FILES');

    const body = await request.json().catch(() => null);
    const parsed = createFileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const file = await createFile(projectId, user.id, parsed.data);
    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
