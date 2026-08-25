import { NextResponse } from 'next/server';
import {
  authErrorResponse,
  requireAuthenticatedUser,
  requireWorkspaceCapability,
} from '@/server/auth/authorization';
import { createProjectFromTemplate } from '@/server/projects/project.service';
import { createProjectFromTemplateSchema } from '@/server/projects/schemas';

/** Create a project and its template contents in one database transaction. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;
    await requireWorkspaceCapability(user.id, workspaceId, 'CREATE_PROJECT');

    const parsed = createProjectFromTemplateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const project = await createProjectFromTemplate(workspaceId, user.id, parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
