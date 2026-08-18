import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  createWorkspace,
  listWorkspacesForUser,
} from '@/server/workspaces/service';
import { createWorkspaceSchema } from '@/server/workspaces/schemas';

/**
 * GET /api/workspaces
 *
 * List all workspaces the authenticated user belongs to, with their role
 * in each. Single query — no N+1.
 */
export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const workspaces = await listWorkspacesForUser(user.id);
    return NextResponse.json({ workspaces });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/workspaces
 *
 * Create a new workspace. The creator becomes the OWNER. This is the only
 * way to create a workspace outside of the onboarding flow.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const body = await request.json().catch(() => null);
    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const workspace = await createWorkspace(user.id, parsed.data);
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
