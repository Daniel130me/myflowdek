import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import { shareProjectDocumentSchema } from '@/server/documents/schemas';
import { shareProjectDocument } from '@/server/documents/project-document.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, documentId } = await params;
    const membership = await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const parsed = shareProjectDocumentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    await shareProjectDocument(
      projectId,
      documentId,
      user.id,
      membership.role,
      parsed.data.email,
      parsed.data.role,
    );
    return NextResponse.json({ ok: true, message: `Permission granted in Google Drive for ${parsed.data.email}` });
  } catch (error) {
    return authErrorResponse(error);
  }
}