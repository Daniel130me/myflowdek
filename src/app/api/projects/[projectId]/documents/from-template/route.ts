import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import { createProjectDocumentSchema } from '@/server/documents/schemas';
import { createProjectDocumentFromTemplate } from '@/server/documents/project-document.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'UPLOAD_FILES');
    const parsed = createProjectDocumentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const document = await createProjectDocumentFromTemplate(projectId, user.id, parsed.data);
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}