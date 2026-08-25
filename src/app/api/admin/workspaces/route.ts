import { NextResponse } from 'next/server';
import { requireSuperAdmin, authErrorResponse } from '@/server/auth/authorization';
import { listAllWorkspaces } from '@/server/admin/admin.service';

/**
 * GET /api/admin/workspaces
 *
 * List all workspaces with member + project counts. SUPER_ADMIN only.
 * Supports ?limit and ?offset for pagination.
 */
export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

    const workspaces = await listAllWorkspaces({ limit, offset });
    return NextResponse.json({ workspaces });
  } catch (error) {
    return authErrorResponse(error);
  }
}
