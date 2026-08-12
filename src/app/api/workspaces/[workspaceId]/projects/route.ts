import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  createProject,
  listProjectsForUser,
} from '@/server/projects/project.service';
import { createProjectSchema } from '@/server/projects/schemas';

/**
 * GET /api/workspaces/:workspaceId/projects
 *
 * List projects in a workspace that the user is a member of. Any workspace
 * member can view the project list (they'll only see projects they're a
 * member of).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    // Any workspace member can view projects.
    await requireWorkspaceCapability(user.id, workspaceId, 'VIEW_WORKSPACE');

    const url = new URL(request.url);
    const includeArchived = url.searchParams.get('includeArchived') === 'true';

    const projects = await listProjectsForUser(workspaceId, user.id, includeArchived);
    return NextResponse.json({ projects });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/workspaces/:workspaceId/projects
 *
 * Create a project. The ownerId is ALWAYS the authenticated user — it is
 * never accepted from the request body. Only workspace OWNER/ADMIN/MEMBER
 * can create projects.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;

    // Only workspace OWNER/ADMIN/MEMBER can create projects.
    await requireWorkspaceCapability(user.id, workspaceId, 'CREATE_PROJECT');

    const body = await request.json().catch(() => null);
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    // ownerId comes from the session, never from the browser.
    const project = await createProject(workspaceId, user.id, parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
