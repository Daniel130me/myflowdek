import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import {
  renameProjectDocumentSchema,
  updateProjectDocumentContentSchema,
} from '@/server/documents/schemas';
import {
  getProjectDocumentContent,
  removeProjectDocumentReference,
  renameProjectDocumentReference,
  updateProjectDocumentContent,
} from '@/server/documents/project-document.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, documentId } = await params;
    const membership = await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    return NextResponse.json(
      await getProjectDocumentContent(projectId, documentId, user.id, membership.role),
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, documentId } = await params;
    const membership = await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const parsed = updateProjectDocumentContentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const content = await updateProjectDocumentContent(
      projectId,
      documentId,
      user.id,
      membership.role,
      parsed.data,
    );
    return NextResponse.json({ content, canEdit: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, documentId } = await params;
    const membership = await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const parsed = renameProjectDocumentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const document = await renameProjectDocumentReference(
      projectId,
      documentId,
      user.id,
      membership.role,
      parsed.data.name,
    );
    return NextResponse.json({ document });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, documentId } = await params;
    const membership = await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    await removeProjectDocumentReference(projectId, documentId, user.id, membership.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
