import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  updateSection,
  deleteSection,
} from '@/server/sections/section.service';
import { updateSectionSchema } from '@/server/sections/section.service';
import { db } from '@/server/db/client';

/**
 * Verify the section belongs to the project in the URL — prevents IDOR where
 * a member of project A could mutate a section in project B by guessing the
 * sectionId. Returns 404 if the section is missing or mismatched.
 */
async function verifySectionInProject(
  sectionId: string,
  projectId: string,
): Promise<boolean> {
  const section = await db.section.findUnique({
    where: { id: sectionId },
    select: { projectId: true },
  });
  return !!section && section.projectId === projectId;
}

/** PATCH /api/projects/:projectId/sections/:sectionId — update a section. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, sectionId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_SECTIONS');

    if (!(await verifySectionInProject(sectionId, projectId))) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

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
    await requireProjectCapability(user.id, projectId, 'MANAGE_SECTIONS');

    if (!(await verifySectionInProject(sectionId, projectId))) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    await deleteSection(sectionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
