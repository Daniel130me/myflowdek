import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  updateSection,
  deleteSection,
} from '@/server/sections/section.service';
import { updateSectionSchema } from '@/server/sections/section.service';

/** PATCH /api/projects/:projectId/sections/:sectionId — update a section. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, sectionId } = await params;
    await requireProjectMember(user.id, projectId);

    const body = await request.json().catch(() => null);
    const parsed = updateSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const section = await updateSection(sectionId, parsed.data);
    return NextResponse.json({ section });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** DELETE /api/projects/:projectId/sections/:sectionId — delete a section. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, sectionId } = await params;
    await requireProjectMember(user.id, projectId);

    await deleteSection(sectionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
