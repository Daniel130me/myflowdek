import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  listSections,
  createSection,
} from '@/server/sections/section.service';
import { createSectionSchema } from '@/server/sections/section.service';

/** GET /api/projects/:projectId/sections — list sections. Any member. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);
    const sections = await listSections(projectId);
    return NextResponse.json({ sections });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/projects/:projectId/sections — create a section. Any member. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);

    const body = await request.json().catch(() => null);
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const section = await createSection(projectId, parsed.data);
    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
