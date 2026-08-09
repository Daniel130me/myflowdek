import { NextResponse } from 'next/server';
import { requireSuperAdmin, authErrorResponse } from '@/server/auth/authorization';
import { listAllUsers } from '@/server/admin/admin.service';

/**
 * GET /api/admin/users
 *
 * List all platform users with status, role, and counts. SUPER_ADMIN only.
 * Supports ?limit and ?offset for pagination.
 */
export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

    const users = await listAllUsers({ limit, offset });
    return NextResponse.json({ users });
  } catch (error) {
    return authErrorResponse(error);
  }
}
