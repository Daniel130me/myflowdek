import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import { listProjectDocuments } from '@/server/documents/project-document.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    return NextResponse.json({ documents: await listProjectDocuments(projectId) });
  } catch (error) {
    return authErrorResponse(error);
  }
}